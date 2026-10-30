#!/usr/bin/env node
// Validates .bpmn files against BPMN 2.0.2 + BPMN DI (the official OMG XSDs of docs/bpmn/omg/) and the AgentCase extension XSD
// (docs/bpmn/agentcase-bpmn-1.0.xsd), the check of docs/SPEC_BPMN.md § 5.3 (decision D-B7: xmllint, no npm dependency).
//   node tools/bpmn-validate.mjs [--json] [--strict] [--no-schema] file.bpmn...
// Per file, in this order:
//   1. security (F-B10), on the raw text, before any XML parser sees it: size ≤ 5 MB; no <!DOCTYPE, no <!ENTITY, no processing instruction
//      other than the XML declaration; depth ≤ 64; ≤ 20,000 elements; every `id` attribute matches ID_PATTERN and is not a reserved name.
//      A file that fails here is NOT handed to xmllint. Text that looks like markup (names, documentation) is a warning, not an error
//      (F-B10: imported text is never rendered as HTML, so it is neutralised, not refused).
//   2. schema: xmllint --noout --nonet --schema docs/bpmn/agentcase-bpmn-validate.xsd (no entity expansion, no network).
//   3. profile: the root is bpmn:definitions, and every ac: element / attribute is DECLARED by the extension XSD. BPMN reads extension content
//      with processContents="lax", which silently skips an undeclared name; this step makes ac: strict.
// Exit code: 0 every file valid (warnings allowed unless --strict), 1 at least one invalid file, 2 usage error or xmllint missing.
// --no-schema runs step 1 only (no xmllint needed). --json prints one JSON array of { file, ok, schema, errors[], warnings[] }.
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
export const SCHEMA = resolve(root, 'docs/bpmn/agentcase-bpmn-validate.xsd');
export const AC_XSD = resolve(root, 'docs/bpmn/agentcase-bpmn-1.0.xsd');
export const AC_NS = 'https://agentcase.app/schema/bpmn/1.0';
export const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
export const LIMITS = { bytes: 5 * 1024 * 1024, depth: 64, elements: 20000 };
/** The safe id pattern of F-B10 (the reader of phase B2 applies the same one). */
export const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/;
export const RESERVED_IDS = new Set(['__proto__', 'prototype', 'constructor']);
const MARKUP = /&lt;\s*[A-Za-z!/?]|&#0*60;|&#x0*3c;|javascript:/i;

const NAME = '[A-Za-z_][\\w.:-]*';
const ATTR = new RegExp(`(${NAME})\\s*=\\s*("[^"]*"|'[^']*')`, 'g');
const TAG = new RegExp(`<(/?)(${NAME})((?:\\s+${NAME}\\s*=\\s*(?:"[^"]*"|'[^']*'))*)\\s*(/?)>`, 'g');

/** The tags of a document (comments and CDATA removed): { close, name, attrs: [name, value][], selfClose, before (text before the tag) }. */
function* tags(xml) {
  let last = 0;
  for (const m of xml.matchAll(TAG)) {
    const attrs = [...m[3].matchAll(ATTR)].map((a) => [a[1], a[2].slice(1, -1)]);
    yield { close: !!m[1], name: m[2], attrs, selfClose: !!m[4], before: xml.slice(last, m.index) };
    last = m.index + m[0].length;
  }
}
const stripped = (text) => text.replace(/^\uFEFF/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');

/** Step 1: the F-B10 checks on the raw text. */
export function securityCheck(text, bytes = Buffer.byteLength(text)) {
  const errors = [], warnings = [], err = (code, message) => errors.push({ code, message });
  if (bytes > LIMITS.bytes) err('too-large', `${bytes} bytes > ${LIMITS.bytes}`);
  // on the text without comments and CDATA sections, where these constructs are inert (a code sample in documentation is not refused)
  const xml = stripped(text);
  if (/<!DOCTYPE/i.test(xml)) err('doctype', 'a <!DOCTYPE declaration (DTD, entities, XXE) is refused');
  if (/<!ENTITY/i.test(xml)) err('entity', 'an entity declaration is refused');
  for (const m of xml.matchAll(/<\?([^\s?]*)/g)) {
    if (!(m.index === 0 && m[1] === 'xml')) err('processing-instruction', `<?${m[1]} at offset ${m.index}: only the XML declaration is allowed`);
  }
  if (errors.length) return { errors, warnings };
  const cdata = [...text.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((m) => m[1]);
  if (cdata.some((c) => /<\s*[A-Za-z!/?]/.test(c) || /javascript:/i.test(c))) warnings.push({ code: 'markup-in-text', message: 'a CDATA section holds markup' });
  let depth = 0, maxDepth = 0, count = 0;
  const ids = new Set(), markupIn = new Set();
  for (const t of tags(xml)) {
    if (MARKUP.test(t.before)) markupIn.add('text');
    if (t.close) { depth--; continue; }
    count++; depth++; maxDepth = Math.max(maxDepth, depth);
    for (const [name, value] of t.attrs) {
      if (MARKUP.test(value)) markupIn.add(`${t.name}/@${name}`);
      if (name !== 'id') continue;
      if (!ID_PATTERN.test(value)) err('bad-id', `id "${value.slice(0, 80)}" does not match ${ID_PATTERN}`);
      else if (RESERVED_IDS.has(value)) err('reserved-id', `id "${value}" is a reserved name`);
      else if (ids.has(value)) err('duplicate-id', `id "${value}" is used twice`);
      ids.add(value);
    }
    if (t.selfClose) depth--;
  }
  if (maxDepth > LIMITS.depth) err('too-deep', `depth ${maxDepth} > ${LIMITS.depth}`);
  if (count > LIMITS.elements) err('too-many-elements', `${count} elements > ${LIMITS.elements}`);
  if (markupIn.size) warnings.push({ code: 'markup-in-text', message: `text that looks like markup in ${[...markupIn].slice(0, 5).join(', ')}` });
  return { errors, warnings };
}

/** libxml2 does not enforce xsd:IDREF: the IDREF attributes of the extension XSD (on ac: elements, and ac:agent on tasks) and the IDREF
 *  attributes of BPMN sequence flows and default flows are resolved here against the ids of the document. */
export function refCheck(text, idrefs) {
  const xml = stripped(text), errors = [], ids = new Set(), refs = [];
  const acPrefixes = new Set([...xml.matchAll(/xmlns:([\w.-]+)\s*=\s*["']([^"']*)["']/g)].filter((m) => m[2] === AC_NS).map((m) => m[1]));
  for (const t of tags(xml)) {
    if (t.close) continue;
    const [prefix, local] = t.name.includes(':') ? t.name.split(':') : ['', t.name];
    for (const [name, value] of t.attrs) {
      if (name === 'id') { ids.add(value); continue; }
      const [ap, al] = name.includes(':') ? name.split(':') : ['', name];
      const acRef = (acPrefixes.has(prefix) && !ap && idrefs.has(`${local}/${name}`)) || (acPrefixes.has(ap) && idrefs.has(`/${al}`));
      const bpmnRef = !acPrefixes.has(prefix) && !ap && ((local === 'sequenceFlow' && /^(sourceRef|targetRef)$/.test(name)) || name === 'default');
      if (acRef || bpmnRef) for (const v of value.split(/\s+/).filter(Boolean)) refs.push([t.name, name, v]);
    }
  }
  for (const [el, attr, v] of refs) if (!ids.has(v)) errors.push({ code: 'unresolved-ref', message: `${el}/@${attr}="${v}" does not match any id` });
  return errors;
}

export const xmllintAvailable = () => spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0;
const xmllint = (args) => spawnSync('xmllint', ['--nonet', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const xpath = (file, expr) => xmllint(['--xpath', expr, file]);

/** The names of the global elements and global attributes of the extension XSD. */
export function declaredNames() {
  const pick = (kind) => [...xpath(AC_XSD, `/*[local-name()='schema']/*[local-name()='${kind}']/@name`).stdout.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
  // the IDREF attributes as "element/attribute" ("/attribute" for a global one), from the nesting of xsd:element declarations
  const idrefs = new Set(), stack = [];
  for (const t of tags(stripped(readFileSync(AC_XSD, 'utf8')))) {
    const name = t.attrs.find(([k]) => k === 'name')?.[1], type = t.attrs.find(([k]) => k === 'type')?.[1];
    if (t.name === 'xsd:element' && !t.selfClose) { if (t.close) stack.pop(); else stack.push(name); }
    if (t.name === 'xsd:attribute' && !t.close && /^xsd:IDREFS?$/.test(type ?? '')) idrefs.add(`${stack.at(-1) ?? ''}/${name}`);
  }
  return { elements: pick('element'), attributes: pick('attribute'), idrefs };
}
let declared;

/** Steps 2 and 3 for one file (xmllint must be installed). */
function schemaCheck(file) {
  const errors = [], res = xmllint(['--noout', '--schema', SCHEMA, file]);
  if (res.status !== 0) {
    const lines = res.stderr.split('\n').filter((l) => l && !/ fails to validate$| validates$/.test(l));
    for (const l of lines.slice(0, 50)) errors.push({ code: 'schema', message: l.replace(`${file}:`, 'line ') });
    if (!lines.length) errors.push({ code: 'schema', message: `xmllint exit ${res.status}` });
  }
  if (xpath(file, `count(/*[local-name()='definitions' and namespace-uri()='${BPMN_NS}'])`).stdout.trim() !== '1') {
    errors.push({ code: 'not-bpmn', message: 'the root element is not bpmn:definitions' });
  }
  declared ??= declaredNames();
  const notIn = (names) => (names.length ? `not(${names.map((n) => `local-name()='${n}'`).join(' or ')})` : 'true()');
  const elems = xpath(file, `//*[namespace-uri()='${AC_NS}'][namespace-uri(..)!='${AC_NS}'][${notIn(declared.elements)}]`).stdout;
  for (const n of new Set([...elems.matchAll(/<([\w.:-]+)/g)].map((m) => m[1]))) {
    errors.push({ code: 'ac-undeclared', message: `element ${n} is not declared by agentcase-bpmn-1.0.xsd` });
  }
  const attrs = xpath(file, `//@*[namespace-uri()='${AC_NS}'][${notIn(declared.attributes)}]`).stdout;
  for (const n of new Set([...attrs.matchAll(/([\w.:-]+)="/g)].map((m) => m[1]))) {
    errors.push({ code: 'ac-undeclared', message: `attribute ${n} is not declared by agentcase-bpmn-1.0.xsd` });
  }
  errors.push(...refCheck(readFileSync(file, 'utf8'), declared.idrefs));
  return errors;
}

/** Validates one file: { file, ok, schema: 'valid' | 'invalid' | 'skipped', errors, warnings }. */
export function validateFile(file, { schema = true, strict = false } = {}) {
  const bytes = statSync(file).size;
  const sec = securityCheck(bytes > LIMITS.bytes ? '' : readFileSync(file, 'utf8'), bytes);
  const errors = [...sec.errors], warnings = sec.warnings;
  let state = 'skipped';
  if (schema && !errors.length) { const e = schemaCheck(file); errors.push(...e); state = e.length ? 'invalid' : 'valid'; }
  const ok = !errors.length && !(strict && warnings.length);
  return { file, ok, schema: state, errors, warnings };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2), files = args.filter((a) => !a.startsWith('--')), flag = (f) => args.includes(f);
  if (!files.length) { console.error('usage: node tools/bpmn-validate.mjs [--json] [--strict] [--no-schema] file.bpmn...'); process.exit(2); }
  const schema = !flag('--no-schema');
  if (schema && !xmllintAvailable()) { console.error('bpmn-validate: xmllint is not installed (Debian / Ubuntu: apt-get install libxml2-utils)'); process.exit(2); }
  const results = files.map((f) => validateFile(f, { schema, strict: flag('--strict') }));
  if (flag('--json')) console.log(JSON.stringify(results, null, 1));
  else {
    for (const r of results) {
      console.log(`${r.ok ? 'valid  ' : 'INVALID'} ${r.file} (schema: ${r.schema})`);
      for (const e of r.errors) console.log(`  error   [${e.code}] ${e.message}`);
      for (const w of r.warnings) console.log(`  warning [${w.code}] ${w.message}`);
    }
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
