/** @calc-zone process-model */
import { without } from '../partial';
import { el, kid, NS, withChildren, type XElement } from '../xml';
import { fitted, insertChild, type Rank } from './tree';

/**
 * Writers shared by the extended profile (phase B5b): an `ac:` element set or removed in an element's `extensionElements` (created at its
 * schema place when missing, dropped when it becomes empty), and a BPMN child replaced by local name (a task's loop characteristics).
 */
const blankOnly = (e: XElement): boolean => e.children.every((c) => c.kind === 'text' && !c.text.trim());

/** The element with its `ac:<local>` extension replaced by `child` (null removes it), other extension content kept in place. */
export function setAc(e: XElement, local: string, child: XElement | null, rank: Rank): XElement {
  const x = kid(e, NS.bpmn, 'extensionElements');
  if (!x) return child ? insertChild(e, fitted(e, el('bpmn:extensionElements', {}, [child])), rank) : e;
  const old = kid(x, NS.ac, local);
  let nx: XElement;
  if (old) nx = child ? withChildren(x, x.children.map((c) => (c === old ? fitted(x, child) : c))) : withChildren(x, without(x.children, (c) => c === old));
  else if (child) nx = insertChild(x, fitted(x, child), () => 0);
  else return e;
  if (blankOnly(nx)) return withChildren(e, without(e.children, (c) => c === x));
  return withChildren(e, e.children.map((c) => (c === x ? nx : c)));
}

/** The element with its BPMN children of these local names replaced by `child` (inserted at its schema place; null removes them). */
export function replaceKids(e: XElement, locals: readonly string[], child: XElement | null, rank: Rank): XElement {
  const kept = withChildren(e, without(e.children, (c) => c.ns === NS.bpmn && locals.includes(c.local)));
  return child ? insertChild(kept, fitted(kept, child), rank) : kept;
}
