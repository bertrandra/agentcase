/** @calc-zone process-model */
import { isProgrammeKey } from '../programme/storedKeys';
import { appendChild } from './editTree';
import { fitted } from './profile/tree';
import { attr, el, kid, kids, NS, withAttrs, withChildren, type XDocument, type XElement, type XNode } from './xml';

/**
 * The programme's stored values in the case's document (docs/SPEC_BPMN.md § 6.1 schema v4, § 19.5 B9c; D-B1 / D-B26): ONE element
 * `ac:programmeValues` in the delivery process's `extensionElements`, an `ac:value key value` per value (`programme/storedKeys.ts`). The typed
 * views read it through `caseValues` (memoised on the element and the form values); commands never write it directly: the store's address layer
 * turns a changed value into node patches of this element (an attribute, or an entry appended at the end).
 */
type Values = Readonly<Record<string, string>>;
const EMPTY: Values = Object.freeze({});
const LOCAL = 'programmeValues';

/** The delivery process of a document (the first process that is not the transformation programme). */
const deliveryOf = (d: XDocument): XElement | undefined => kids(d.root, NS.bpmn, 'process').find((p) => attr(p, 'ac:programme') !== 'true');
/** The stored values element of a document, if any. */
export function storedElement(d: XDocument | undefined): XElement | undefined {
  const p = d?.root ? deliveryOf(d) : undefined, x = p && kid(p, NS.bpmn, 'extensionElements');
  return x ? kid(x, NS.ac, LOCAL) : undefined;
}

const memo = new WeakMap<XElement, Values>();
/** The values the document holds (key → value, in document order); empty without the element. Memoised on the element. */
export function programmeValuesOf(d: XDocument | undefined): Values {
  const e = storedElement(d);
  if (!e) return EMPTY;
  let v = memo.get(e);
  if (!v) {
    const out: Record<string, string> = {};
    for (const x of kids(e, NS.ac, 'value')) { const k = attr(x, 'key'); if (k !== undefined && isProgrammeKey(k)) out[k] = attr(x, 'value') ?? ''; }
    v = Object.freeze(out);
    memo.set(e, v);
  }
  return v;
}

const isBlank = (n: XNode | undefined): boolean => n?.kind === 'text' && !n.text.trim();
/** The element with its entries set (in place), appended (new keys, at the end) or removed (null). */
function patched(e: XElement, patch: Readonly<Record<string, string | null>>): XElement {
  const out: XNode[] = [], seen = new Set<string>();
  for (const c of e.children) {
    const k = c.kind === 'element' && c.ns === NS.ac && c.local === 'value' ? attr(c, 'key') : undefined;
    if (k === undefined || !(k in patch)) { out.push(c); continue; }
    seen.add(k);
    const v = patch[k];
    if (v === null || v === undefined) { if (isBlank(out[out.length - 1])) out.pop(); continue; }
    out.push(withAttrs(c as XElement, { value: v }));
  }
  let next = withChildren(e, out);
  for (const [k, v] of Object.entries(patch)) if (!seen.has(k) && v !== null && v !== undefined) next = appendChild(next, el('ac:value', { key: k, value: v }));
  return next;
}

/** The extension elements with the stored values element replaced by `next` (appended when new, removed with its indentation when null). */
function inExt(x: XElement, cur: XElement | null, next: XElement | null): XElement {
  if (!cur) return next ? appendChild(x, fitted(x, next)) : x;
  const out: XNode[] = [];
  for (const c of x.children) {
    if (c !== cur) { out.push(c); continue; }
    // an edited element keeps its layout (node-level change); an element that had no entry is laid out afresh
    if (next) out.push(kids(cur).length ? next : fitted(x, next)); else if (isBlank(out[out.length - 1])) out.pop();
  }
  return withChildren(x, out);
}
/** The delivery process rebuilt by `fn` on its stored values element (`null`: the element is absent; a null result removes it). */
function onElement(d: XDocument, fn: (e: XElement | null) => XElement | null): XDocument {
  const p = deliveryOf(d), x = p && kid(p, NS.bpmn, 'extensionElements');
  if (!p || !x) return d;
  const cur = kid(x, NS.ac, LOCAL) ?? null, next = fn(cur);
  if (next === cur) return d;
  const np = withChildren(p, p.children.map((c) => (c === x ? inExt(x, cur, next) : c)));
  return np === p ? d : { ...d, root: withChildren(d.root, d.root.children.map((c) => (c === p ? np : c))) };
}

/** The document with these values set (null removes one); the same document when nothing changes. Unchanged nodes keep their identity. */
export function withProgrammeValues(d: XDocument, patch: Readonly<Record<string, string | null>>): XDocument {
  const keys = Object.keys(patch).filter(isProgrammeKey);
  if (!keys.length) return d;
  const p = Object.fromEntries(keys.map((k) => [k, patch[k] ?? null]));
  const have = programmeValuesOf(d);
  if (keys.every((k) => (p[k] === null ? !(k in have) : have[k] === p[k]))) return d;
  return onElement(d, (e) => patched(e ?? el(`ac:${LOCAL}`), p));
}
/** The document without its stored values (an export: the values are written on the programme's activities instead; the editor's input). */
export const withoutStoredValues = (d: XDocument): XDocument => onElement(d, () => null);
/**
 * A product's own process document (a whole-document override, F-B20) keeps an EMPTY values element: the product reads the common document's
 * values with its own per-field overrides on top (`portfolio/layers.ts`), never a copy (no second source). Same position, so the paths of the
 * other nodes do not move.
 */
export const emptiedStoredValues = (d: XDocument): XDocument => onElement(d, (e) => (e && kids(e).length ? el(`ac:${LOCAL}`) : e));
/** `next` with the stored values of `from` (an import or an editor save replaces the process, never the programme's values). */
export function keepStoredValues(next: XDocument, from: XDocument): XDocument {
  const keep = storedElement(from) ?? null;
  return storedElement(next) === keep ? next : onElement(next, () => keep);
}

type CaseLike = { dom?: { values?: Record<string, string> }; BPMN?: unknown };
const merged = new WeakMap<object, WeakMap<object, Values>>();
/**
 * THE ACCESSOR of the case's input values (schema v4): the form values over the document's stored values. A stored case holds no programme key in
 * its form values; a product's resolved case does for its own overrides (and knowledge subset), which win. Memoised on both identities.
 */
export function caseValues(s: CaseLike): Values {
  const dom = s.dom?.values ?? EMPTY, d = s.BPMN && typeof s.BPMN === 'object' ? (s.BPMN as XDocument) : undefined, e = storedElement(d);
  if (!e) return dom;
  let m = merged.get(dom);
  if (!m) { m = new WeakMap(); merged.set(dom, m); }
  let v = m.get(e);
  if (!v) { v = Object.freeze({ ...programmeValuesOf(d), ...dom }); m.set(e, v); }
  return v;
}
