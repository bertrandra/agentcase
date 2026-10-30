/** @calc-zone process-model */
import { attr, kid, NS, withAttrs, withChildren, type AttrInput, type XElement, type XNode } from './xml';

/**
 * Small structural edits of the node tree used by the process commands (spec § 9). Each returns the same object when nothing changes and
 * rebuilds only the path to what changed, so the store's diff (and the undo patch) is the changed nodes. Removals and insertions keep the
 * tree in the form the reader gives back (no two text nodes side by side), so a saved and re-opened document is the same tree.
 */
const isBlank = (n: XNode | undefined): boolean => n?.kind === 'text' && !n.text.trim();

/** The element with this id, rebuilt by `fn` (null removes it with the white space before it); the whole tree is searched depth first. */
export function editById(e: XElement, id: string, fn: (x: XElement) => XElement | null): XElement {
  let hit = false;
  const out: XNode[] = [];
  for (const c of e.children) {
    if (hit || c.kind !== 'element') { out.push(c); continue; }
    if (attr(c, 'id') === id) {
      hit = true;
      const n = fn(c);
      if (n) out.push(n); else if (isBlank(out[out.length - 1])) out.pop();
      continue;
    }
    const n = editById(c, id, fn);
    if (n !== c) hit = true;
    out.push(n);
  }
  return hit ? withChildren(e, out) : e;
}

/** Every element `pred` selects rebuilt by `fn` (null removes it with the white space before it). */
export function editWhere(e: XElement, pred: (x: XElement) => boolean, fn: (x: XElement) => XElement | null): XElement {
  const out: XNode[] = [];
  for (const c of e.children) {
    if (c.kind !== 'element') { out.push(c); continue; }
    if (pred(c)) {
      const n = fn(c);
      if (n) out.push(editWhere(n, pred, fn)); else if (isBlank(out[out.length - 1])) out.pop();
      continue;
    }
    out.push(editWhere(c, pred, fn));
  }
  return withChildren(e, out);
}

/** The element with a child appended, indented like its siblings (before the white space that closes the element). */
export function appendChild(parent: XElement, child: XElement): XElement {
  const cs = parent.children, tail = cs[cs.length - 1];
  if (!isBlank(tail)) return withChildren(parent, [...cs, child]);
  const pad = cs.length >= 3 && isBlank(cs[cs.length - 3]) ? cs[cs.length - 3] as XNode
    : { kind: 'text' as const, text: `${(tail as { text: string }).text}  ` };
  return withChildren(parent, [...cs.slice(0, -1), pad, child, tail as XNode]);
}

/** Attributes set on the `ac:<local>` element of an element's `extensionElements` (when it has one). */
export function withExt(e: XElement, local: string, patch: AttrInput): XElement {
  const x = kid(e, NS.bpmn, 'extensionElements');
  if (!x) return e;
  return withChildren(e, e.children.map((c) => (c !== x ? c
    : withChildren(x, x.children.map((y) => (y.kind === 'element' && y.ns === NS.ac && y.local === local ? withAttrs(y, patch) : y))))));
}

/** The `id` of every element of the tree (to refuse a duplicate). */
export function idsOf(e: XElement, out = new Set<string>()): Set<string> {
  const id = attr(e, 'id');
  if (id !== undefined) out.add(id);
  for (const c of e.children) if (c.kind === 'element') idsOf(c, out);
  return out;
}
