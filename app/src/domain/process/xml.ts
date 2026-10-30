/** @calc-zone process-model */
/**
 * The in-memory form of the case's native BPMN XML (spec § 6.1, D-B1): the XML infoset as an immutable node tree. An element keeps its
 * namespace URI, local name and prefix as written, its attributes in document order (namespace declarations `xmlns` / `xmlns:p` included, as
 * written) and its children (elements, text, comments) in order. Whitespace between elements is ordinary text, so `serialize` writes the tree
 * back byte for byte. Pure TypeScript: no DOM here (the DOM-based reader comes in phase B2).
 */
export interface XAttr { readonly name: string; readonly ns: string; readonly value: string }
export interface XElement {
  readonly kind: 'element'; readonly ns: string; readonly local: string; readonly prefix: string;
  readonly attrs: readonly XAttr[]; readonly children: readonly XNode[];
}
export interface XText { readonly kind: 'text'; readonly text: string }
export interface XComment { readonly kind: 'comment'; readonly text: string }
export type XNode = XElement | XText | XComment;
/** A whole document: the XML declaration (null when absent), the text around the root element (whitespace as written) and the root. */
export interface XDocument { readonly kind: 'document'; readonly decl: string | null; readonly before: string; readonly root: XElement; readonly after: string }

export const NS = {
  bpmn: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
  bpmndi: 'http://www.omg.org/spec/BPMN/20100524/DI',
  dc: 'http://www.omg.org/spec/DD/20100524/DC',
  di: 'http://www.omg.org/spec/DD/20100524/DI',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  ac: 'https://agentcase.app/schema/bpmn/1.0',
  xmlns: 'http://www.w3.org/2000/xmlns/',
} as const;
export type Prefix = Exclude<keyof typeof NS, 'xmlns'>;
export const XML_DECL = '<?xml version="1.0" encoding="UTF-8"?>';

/** The namespace URI of a qualified name written with one of the known prefixes (attributes without a prefix have no namespace). */
function nsOf(qname: string, isAttr: boolean): string {
  const i = qname.indexOf(':');
  if (qname === 'xmlns' || qname.startsWith('xmlns:')) return NS.xmlns;
  if (i < 0) return isAttr ? '' : NS.bpmn;
  const p = qname.slice(0, i) as Prefix;
  if (!(p in NS)) throw new Error(`xml: unknown prefix in ${qname}`);
  return NS[p];
}

export type AttrInput = Record<string, string | number | boolean | null | undefined>;
/** Attributes from a plain record (insertion order kept); null / undefined values are left out. */
export function attrsOf(a: AttrInput): XAttr[] {
  const out: XAttr[] = [];
  for (const [name, v] of Object.entries(a)) if (v !== null && v !== undefined) out.push({ name, ns: nsOf(name, true), value: String(v) });
  return out;
}

/** An element built from a qualified name with a known prefix (`bpmn:task`, `ac:activity`, `dc:Bounds`). */
export function el(qname: string, attrs: AttrInput = {}, children: readonly XNode[] = []): XElement {
  const i = qname.indexOf(':');
  return { kind: 'element', ns: nsOf(qname, false), local: i < 0 ? qname : qname.slice(i + 1), prefix: i < 0 ? '' : qname.slice(0, i),
    attrs: attrsOf(attrs), children };
}
export const text = (t: string): XText => ({ kind: 'text', text: t });
export const comment = (t: string): XComment => ({ kind: 'comment', text: t });
export const doc = (root: XElement, decl: string | null = XML_DECL): XDocument => ({ kind: 'document', decl, before: decl ? '\n' : '', root, after: '\n' });

/** Qualified name of an element as written. */
export const qnameOf = (e: XElement): string => (e.prefix ? `${e.prefix}:${e.local}` : e.local);
/** Value of an attribute by its written name (`id`, `ac:inScope`), or undefined. */
export const attr = (e: XElement, name: string): string | undefined => e.attrs.find((a) => a.name === name)?.value;
/** The element children, optionally only those with this namespace and local name. */
export function kids(e: XElement, ns?: string, local?: string): XElement[] {
  const out: XElement[] = [];
  for (const c of e.children) if (c.kind === 'element' && (ns === undefined || c.ns === ns) && (local === undefined || c.local === local)) out.push(c);
  return out;
}
export const kid = (e: XElement, ns: string, local: string): XElement | undefined => kids(e, ns, local)[0];
/** The concatenated text content of an element's direct text children. */
export const textOf = (e: XElement): string => e.children.map((c) => (c.kind === 'text' ? c.text : '')).join('');

/**
 * A copy of the element with attributes set (in place when present, appended otherwise) or removed (value null / undefined).
 * Returns the same object when nothing changes, so unchanged subtrees keep their identity.
 */
export function withAttrs(e: XElement, patch: AttrInput): XElement {
  let attrs = e.attrs.slice(), changed = false;
  for (const [name, v] of Object.entries(patch)) {
    const i = attrs.findIndex((a) => a.name === name);
    if (v === null || v === undefined) { if (i >= 0) { attrs = attrs.filter((_, j) => j !== i); changed = true; } continue; }
    const value = String(v), cur = attrs[i];
    if (cur && cur.value === value) continue;
    if (cur) attrs[i] = { ...cur, value }; else attrs.push({ name, ns: nsOf(name, true), value });
    changed = true;
  }
  return changed ? { ...e, attrs } : e;
}
/** A copy with new children, or the same element when every child is the same object. */
export function withChildren(e: XElement, children: readonly XNode[]): XElement {
  return children.length === e.children.length && children.every((c, i) => c === e.children[i]) ? e : { ...e, children };
}
