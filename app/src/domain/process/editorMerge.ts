/** @calc-zone process-model */
import { attr, NS, withChildren, type XAttr, type XDocument, type XElement, type XNode } from './xml';
import { indent } from './xmlWrite';

/**
 * The write-back of the BPMN editor (docs/SPEC_BPMN.md D-B6 b, phase B6): the document the editor saves (bpmn-js re-serialises it: its own
 * white space, attribute order and prefixes, no comments) is merged INTO the case's tree, so that only what the user changed is new. Elements are
 * matched by id (else by name, text and rank among their siblings); a matched element keeps its attributes in place (values compared after line-end
 * and tab normalisation, namespace declarations ignored), its comments, its white space and its position; new elements are re-prefixed with the
 * case's prefixes, indented, and placed after the matched sibling that precedes them in the editor's order; elements the editor dropped are removed
 * with the white space before them. Nothing changed → the SAME tree (the same objects), so a save without changes is no command and no byte.
 */
const norm = (s: string): string => s.replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
const local = (a: XAttr): string => a.name.slice(a.name.indexOf(':') + 1);
const isDecl = (a: XAttr): boolean => a.ns === NS.xmlns;
const elems = (e: XElement): XElement[] => e.children.filter((c): c is XElement => c.kind === 'element');
const textIn = (e: XElement): string => e.children.map((c) => (c.kind === 'text' ? c.text : '')).join('');
const blank = (n: XNode | undefined): boolean => n?.kind === 'text' && !n.text.trim();
/** The attribute defaults of the BPMN / DI metamodel (bpmn-moddle's descriptors): the editor does not write an attribute equal to its default. */
const DEFAULTS: Readonly<Record<string, string>> = {
  gatewayDirection: 'Unspecified', instantiate: 'false', eventGatewayType: 'Exclusive', mustUnderstand: 'false', isReference: 'false',
  textFormat: 'text/plain', isInterrupting: 'true', parallelMultiple: 'false', cancelActivity: 'true', waitForCompletion: 'true', isCollection: 'false',
  isUnlimited: 'true', minimum: '0', maximum: '1', loopType: 'None', isForCompensation: 'false', startQuantity: '1', completionQuantity: '1',
  triggeredByEvent: 'false', isSequential: 'false', behavior: 'All', testBefore: 'false', cancelRemainingInstances: 'true',
  expressionLanguage: 'http://www.w3.org/1999/XPath', typeLanguage: 'http://www.w3.org/2001/XMLSchema', messageVisibleKind: 'initiating', x: '0', y: '0',
};
/** An attribute the editor's text leaves out although the user did not remove it: a default value, or a reference it could not resolve. */
const implied = (a: XAttr): boolean => {
  const d = DEFAULTS[local(a)];
  return a.name === 'definition' || (d !== undefined && (d === a.value || (d === '0' && Number(a.value) === 0)));
};

/** The case's prefix of each namespace (its root declarations), and the declarations a merged tree needs in addition. */
export class Prefixes {
  readonly of = new Map<string, string>();
  readonly added: XAttr[] = [];
  constructor(root: XElement) {
    for (const a of root.attrs) if (isDecl(a) && !this.of.has(a.value)) this.of.set(a.value, a.name === 'xmlns' ? '' : local(a));
    if (!this.of.has(root.ns)) this.of.set(root.ns, root.prefix);
  }
  /** The prefix of a namespace in the case (declared on the root when it is new: the editor's prefix, made unique). */
  prefix(ns: string, wanted: string): string {
    const hit = this.of.get(ns);
    if (hit !== undefined) return hit;
    const used = new Set(this.of.values());
    let p = wanted || 'ns', i = 1;
    while (used.has(p)) p = `${wanted || 'ns'}${i++}`;
    this.of.set(ns, p);
    this.added.push({ name: `xmlns:${p}`, ns: NS.xmlns, value: ns });
    return p;
  }
}

/** An element of the editor's document written with the case's prefixes (namespace declarations dropped: the root carries them). */
export function reprefix(e: XElement, px: Prefixes): XElement {
  const attrs = e.attrs.filter((a) => !isDecl(a)).map((a) => (a.ns && a.ns !== NS.xmlns && a.name.includes(':')
    ? { ...a, name: `${px.prefix(a.ns, a.name.slice(0, a.name.indexOf(':')))}:${local(a)}` } : a));
  const children = e.children.filter((c) => c.kind !== 'text' || elems(e).length === 0 || c.text.trim())
    .map((c) => (c.kind === 'element' ? reprefix(c, px) : c));
  return { ...e, prefix: px.prefix(e.ns, e.prefix), attrs, children };
}

const NUM = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i, DI_NS: readonly string[] = [NS.dc, NS.di, NS.bpmndi];
/** Same value as written by the editor: the same text (line ends and tabs as a reader normalises them), or the same number on the diagram. */
const sameValue = (ns: string, a: string, b: string): boolean =>
  norm(a) === norm(b) || (DI_NS.includes(ns) && NUM.test(a) && NUM.test(b) && Number(a) === Number(b));

/** The case element's attributes with the editor's values (same object when nothing changed). */
function mergeAttrs(c: XElement, e: XElement, px: Prefixes): readonly XAttr[] {
  const key = (a: XAttr) => `${a.ns}|${local(a)}`, want = new Map(e.attrs.filter((a) => !isDecl(a)).map((a) => [key(a), a]));
  const out: XAttr[] = [];
  let changed = false;
  for (const a of c.attrs) {
    if (isDecl(a)) { out.push(a); continue; }
    const w = want.get(key(a));
    want.delete(key(a));
    if (!w) { if (implied(a)) out.push(a); else changed = true; continue; }
    if (sameValue(c.ns, w.value, a.value)) out.push(a); else { out.push({ ...a, value: w.value }); changed = true; }
  }
  for (const w of want.values()) {
    out.push(w.ns && w.name.includes(':') ? { ...w, name: `${px.prefix(w.ns, w.name.slice(0, w.name.indexOf(':')))}:${local(w)}` } : w);
    changed = true;
  }
  return changed ? out : c.attrs;
}

/** The match keys of a list of sibling elements: `#id`, else name (+ text of a leaf) and rank among the siblings with the same name. */
function keysOf(list: readonly XElement[]): string[] {
  const seen = new Map<string, number>();
  return list.map((x) => {
    const id = attr(x, 'id');
    if (id !== undefined) return `#${id}`;
    const base = `${x.ns}|${x.local}|${elems(x).length ? '' : norm(textIn(x))}`, n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return `${base}|${n}`;
  });
}

interface Group { lead: XNode[]; el: XElement }
/** The children of an element as groups: each element with the text and comments before it, plus the tail after the last one. */
function groupsOf(e: XElement): { groups: Group[]; tail: XNode[] } {
  const groups: Group[] = [];
  let lead: XNode[] = [];
  for (const c of e.children) if (c.kind === 'element') { groups.push({ lead, el: c }); lead = []; } else lead.push(c);
  return { groups, tail: lead };
}

const pad = (depth: number): XNode => ({ kind: 'text', text: `\n${'  '.repeat(depth)}` });

/** The element children of `c` merged with those of `e` (both hold elements, or one of them does). */
function mergeChildren(c: XElement, e: XElement, px: Prefixes, depth: number): readonly XNode[] {
  const { groups, tail } = groupsOf(c), ek = keysOf(elems(e)), ck = keysOf(groups.map((g) => g.el));
  const eByKey = new Map(elems(e).map((x, i) => [ek[i] ?? '', x])), cKeys = new Set(ck);
  const fresh = (x: XElement): XNode[] => [groups.find((g) => blank(g.lead[0]) && g.lead.length === 1)?.lead[0] ?? pad(depth + 1),
    indent(reprefix(x, px), '  ', depth + 1)];
  const after = new Map<string, XElement[]>(), head: XElement[] = [];
  let anchor = '';
  elems(e).forEach((x, i) => {
    const k = ek[i] ?? '';
    if (cKeys.has(k)) { anchor = k; return; }
    if (anchor) (after.get(anchor) ?? after.set(anchor, []).get(anchor) ?? []).push(x); else head.push(x);
  });
  const out: XNode[] = head.flatMap(fresh);
  groups.forEach((g, i) => {
    const k = ck[i] ?? '', x = eByKey.get(k);
    if (!x) return;
    out.push(...g.lead, mergeElement(g.el, x, px, depth + 1), ...(after.get(k) ?? []).flatMap(fresh));
  });
  if (!out.some((n) => n.kind === 'element')) return [];
  return [...out, ...(groups.length ? tail : [pad(depth)])];
}

/** One element of the case merged with its counterpart in the editor's document (same object when they say the same). */
export function mergeElement(c: XElement, e: XElement, px: Prefixes, depth = 0): XElement {
  if (c.ns !== e.ns || c.local !== e.local) return indent(reprefix(e, px), '  ', depth);   // replaced by another type (same id)
  const attrs = mergeAttrs(c, e, px), leaf = !elems(c).length && !elems(e).length;
  const children = leaf ? (norm(textIn(c)) === norm(textIn(e)) ? c.children : e.children.filter((n) => n.kind === 'text'))
    : mergeChildren(c, e, px, depth);
  const next = withChildren(c, children);
  return attrs === c.attrs ? next : { ...next, attrs };
}

/** The case's document with the editor's document merged in (`decl`, the text around the root and the root's declarations kept). */
export function mergeEditorDocument(cur: XDocument, edited: XDocument): XDocument {
  const px = new Prefixes(cur.root);
  let root = mergeElement(cur.root, edited.root, px);
  if (px.added.length) root = { ...root, attrs: [...root.attrs.filter(isDecl), ...px.added, ...root.attrs.filter((a) => !isDecl(a))] };
  return root === cur.root ? cur : { ...cur, root };
}
