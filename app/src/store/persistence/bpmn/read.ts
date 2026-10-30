/** @calc-zone exports */
import { NS, securityCheck, type Finding, type XAttr, type XDocument, type XElement, type XNode } from '@/domain/process';

/**
 * The BPMN reader (docs/SPEC_BPMN.md § 4.3, F-B6 / F-B10, phase B2): XML text → the node tree of `domain/process/xml.ts`. The F-B10 checks run
 * on the raw text first (a refused file never reaches the parser); then the browser's DOMParser (jsdom's in the tests) parses it and the DOM is
 * converted to the infoset, the only form the domain sees. Kept as written: namespaces and prefixes, attribute order (namespace declarations
 * included), white-space text, comments, the text around the root element. CDATA sections become text (same infoset), so `serialize` of the
 * tree gives back the bytes of any file AgentCase wrote, and the canonical form of any other file.
 */
export interface ParseResult { doc: XDocument | null; errors: Finding[]; warnings: Finding[] }

const ELEMENT = 1, TEXT = 3, CDATA = 4, COMMENT = 8;
const PARSER_ERROR_NS = ['http://www.mozilla.org/newlayout/xml/parsererror.xml', 'http://www.w3.org/1999/xhtml'];

function childrenOf(n: Node): XNode[] {
  const out: XNode[] = [];
  for (let c = n.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === ELEMENT) out.push(elementOf(c as Element));
    else if (c.nodeType === TEXT || c.nodeType === CDATA) {
      const last = out[out.length - 1], t = (c as CharacterData).data;
      if (last?.kind === 'text') out[out.length - 1] = { kind: 'text', text: last.text + t };
      else out.push({ kind: 'text', text: t });
    } else if (c.nodeType === COMMENT) out.push({ kind: 'comment', text: (c as CharacterData).data });
  }
  return out;
}
function elementOf(e: Element): XElement {
  const attrs: XAttr[] = [], list = e.attributes;
  for (let i = 0; i < list.length; i++) { const a = list[i] as Attr; attrs.push({ name: a.name, ns: a.namespaceURI ?? '', value: a.value }); }
  return { kind: 'element', ns: e.namespaceURI ?? '', local: e.localName, prefix: e.prefix ?? '', attrs, children: childrenOf(e) };
}

const DECL = /^\uFEFF?(<\?xml[^?]*\?>)?/;
const LEAD = /^(?:\s+|<!--(?:(?!-->)[\s\S])*-->)*/;
/** Where the trailing white space and comments start (a backward scan: a `$`-anchored pattern would be tried at every offset of the text). */
function trailStart(t: string): number {
  let i = t.length;
  for (;;) {
    while (i > 0 && /\s/.test(t.charAt(i - 1))) i--;
    if (!t.endsWith('-->', i)) return i;
    const open = t.lastIndexOf('<!--', i - 3);
    if (open < 0) return i;
    i = open;
  }
}
/** The XML declaration and the raw text (white space, comments) before and after the root element, as written. */
function around(text: string): { decl: string | null; before: string; after: string } {
  const m = DECL.exec(text), rest = text.slice(m?.[0].length ?? 0);
  return { decl: m?.[1] ?? null, before: LEAD.exec(rest)?.[0] ?? '', after: rest.slice(trailStart(rest)) };
}

const parserError = (d: Document): string | null => {
  const hit = PARSER_ERROR_NS.flatMap((ns) => Array.from(d.getElementsByTagNameNS(ns, 'parsererror')))[0];
  return hit ? (hit.textContent ?? 'parse error').trim().slice(0, 300) : null;
};

/** Parses any XML text into the node tree (after the F-B10 checks); `bytes` is the file size when known. No BPMN check. */
export function parseXml(text: string, bytes?: number): ParseResult {
  const sec = securityCheck(text, bytes);
  if (sec.errors.length) return { doc: null, ...sec };
  const dom = new DOMParser().parseFromString(text, 'application/xml'), bad = parserError(dom), root = dom.documentElement;
  if (bad || !root) return { doc: null, errors: [{ code: 'not-xml', message: bad ?? 'no root element' }], warnings: sec.warnings };
  return { doc: { kind: 'document', ...around(text), root: elementOf(root) }, ...sec };
}

/** Parses a BPMN file: the XML checks of `parseXml`, then the root must be `bpmn:definitions` (code `not-bpmn`, as tools/bpmn-validate.mjs). */
export function parseBpmn(text: string, bytes?: number): ParseResult {
  const r = parseXml(text, bytes);
  if (r.doc && (r.doc.root.ns !== NS.bpmn || r.doc.root.local !== 'definitions')) {
    return { doc: null, errors: [{ code: 'not-bpmn', message: 'the root element is not bpmn:definitions' }], warnings: r.warnings };
  }
  return r;
}
