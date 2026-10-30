/** @calc-zone process-model */
import RULES from './securityRules.json';

/**
 * The F-B10 checks (docs/SPEC_BPMN.md § 4.3) on the raw text of a file, before any XML parser sees it: size, no DOCTYPE / entity declaration /
 * processing instruction other than the XML declaration, depth, element count, safe and unique ids; markup in text is a warning (imported text
 * is never rendered as HTML). The rule table (`securityRules.json`) is the one tools/bpmn-validate.mjs reads, and the codes and messages are
 * the same, file for file (tests/bpmn/reader-security.test.ts). Pure string scanning: no DOM.
 */
export type SecurityCode = (typeof RULES.codes)[number];
export interface Finding { code: string; message: string }
export interface SecurityReport { errors: Finding[]; warnings: Finding[] }

export interface Limits { readonly bytes: number; readonly depth: number; readonly elements: number }
/** The F-B10 limits: 5 MB, depth 64, 20,000 elements. */
export const LIMITS: Limits = Object.freeze({ ...RULES.limits });
export const ID_PATTERN = new RegExp(RULES.idPattern);
export const RESERVED_IDS: ReadonlySet<string> = new Set(RULES.reservedIds);
const MARKUP = new RegExp(RULES.markup, 'i');

const NAME = '[A-Za-z_][\\w.:-]*';
const ATTR = new RegExp(`(${NAME})\\s*=\\s*("[^"]*"|'[^']*')`, 'g');
const TAG = new RegExp(`<(/?)(${NAME})((?:\\s+${NAME}\\s*=\\s*(?:"[^"]*"|'[^']*'))*)\\s*(/?)>`, 'g');
interface Tag { close: boolean; name: string; attrs: [string, string][]; selfClose: boolean; before: string }

/** The tags of a document (comments and CDATA removed), with the text before each. */
function* tags(xml: string): Generator<Tag> {
  let last = 0;
  for (const m of xml.matchAll(TAG)) {
    const attrs = [...(m[3] ?? '').matchAll(ATTR)].map((a): [string, string] => [a[1] ?? '', (a[2] ?? '').slice(1, -1)]);
    yield { close: !!m[1], name: m[2] ?? '', attrs, selfClose: !!m[4], before: xml.slice(last, m.index) };
    last = m.index + m[0].length;
  }
}
const stripped = (text: string): string => text.replace(/^\uFEFF/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
/** UTF-8 length of a text. */
export const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length;

/** The checks that refuse a file before parsing: size, DTD, entities, processing instructions. */
function refusals(text: string, bytes: number, max: Limits, err: (code: SecurityCode, message: string) => void): string {
  if (bytes > max.bytes) err('too-large', `${bytes} bytes > ${max.bytes}`);
  // on the text without comments and CDATA sections, where these constructs are inert (a code sample in documentation is not refused)
  const xml = stripped(text);
  if (/<!DOCTYPE/i.test(xml)) err('doctype', 'a <!DOCTYPE declaration (DTD, entities, XXE) is refused');
  if (/<!ENTITY/i.test(xml)) err('entity', 'an entity declaration is refused');
  for (const m of xml.matchAll(/<\?([^\s?]*)/g)) {
    if (!(m.index === 0 && m[1] === 'xml')) err('processing-instruction', `<?${m[1] ?? ''} at offset ${m.index}: only the XML declaration is allowed`);
  }
  return xml;
}

/**
 * F-B10 on the raw text (`bytes`: its size on disk, the UTF-8 length by default). Same codes, messages and order as tools/bpmn-validate.mjs.
 * `max` is the F-B10 limits; only tests pass others (a 2,000-activity file or a four-product collaboration file has more than 20,000 elements).
 */
export function securityCheck(text: string, bytes: number = utf8Bytes(text), max: Limits = LIMITS): SecurityReport {
  const errors: Finding[] = [], warnings: Finding[] = [], err = (code: SecurityCode, message: string) => errors.push({ code, message });
  const xml = refusals(text, bytes, max, err);
  if (errors.length) return { errors, warnings };
  const cdata = [...text.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((m) => m[1] ?? '');
  const cdataMarkup = cdata.some((c) => /<\s*[A-Za-z!/?]/.test(c) || /javascript:/i.test(c));
  if (cdataMarkup) warnings.push({ code: 'markup-in-text', message: 'a CDATA section holds markup' });
  let depth = 0, maxDepth = 0, count = 0;
  const ids = new Set<string>(), markupIn = new Set<string>();
  for (const t of tags(xml)) {
    if (MARKUP.test(t.before)) markupIn.add('text');
    if (t.close) { depth--; continue; }
    count++; depth++; maxDepth = Math.max(maxDepth, depth);
    for (const [name, value] of t.attrs) {
      if (MARKUP.test(value)) markupIn.add(`${t.name}/@${name}`);
      if (name !== 'id') continue;
      if (!ID_PATTERN.test(value)) err('bad-id', `id "${value.slice(0, 80)}" does not match ${String(ID_PATTERN)}`);
      else if (RESERVED_IDS.has(value)) err('reserved-id', `id "${value}" is a reserved name`);
      else if (ids.has(value)) err('duplicate-id', `id "${value}" is used twice`);
      ids.add(value);
    }
    if (t.selfClose) depth--;
  }
  if (maxDepth > max.depth) err('too-deep', `depth ${maxDepth} > ${max.depth}`);
  if (count > max.elements) err('too-many-elements', `${count} elements > ${max.elements}`);
  if (markupIn.size) warnings.push({ code: 'markup-in-text', message: `text that looks like markup in ${[...markupIn].slice(0, 5).join(', ')}` });
  return { errors, warnings };
}
