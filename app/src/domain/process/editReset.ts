/** @calc-zone process-model */
import { findById } from './editMore';
import { idsOf } from './editTree';
import { NS, attr, withChildren, type XDocument, type XElement, type XNode } from './xml';

/**
 * `process.reset` (spec F-B19): back to the default process, whole or one phase, as one step. `base` is the default process (the document a new
 * case starts from, given by the caller: the default case lives in the store). A phase reset puts back the default phase element (its catalogue
 * activities, parameters and scope); activities added to it are dropped, catalogue activities moved elsewhere come back to it, and diagram shapes
 * or edges of elements that no longer exist go. Refused (same document) for a phase the default process does not have or the case no longer has.
 */
const isBlank = (n: XNode | undefined): boolean => n?.kind === 'text' && !n.text.trim();

/** The tree with `fn` applied to every element child; an element `fn` maps to null goes with the white space before it. */
function prune(e: XElement, fn: (x: XElement) => XElement | null): XElement {
  const out: XNode[] = [];
  for (const c of e.children) {
    if (c.kind !== 'element') { out.push(c); continue; }
    const n = fn(c);
    if (n) out.push(n); else if (isBlank(out[out.length - 1])) out.pop();
  }
  return withChildren(e, out);
}

export function resetProcess(d: XDocument, base: XDocument, phase?: string): XDocument {
  if (phase === undefined) return d === base ? d : base;
  const fresh = findById(base.root, phase), cur = findById(d.root, phase);
  if (!fresh || !cur || fresh === cur) return d;
  const back = idsOf(fresh);
  // the phase replaced, then any other element carrying one of its ids removed (a catalogue activity moved to another phase)
  const swap = (e: XElement): XElement | null => {
    if (e === cur) return fresh;
    if (attr(e, 'id') !== undefined && back.has(attr(e, 'id') ?? '')) return null;
    return prune(e, swap);
  };
  let root = prune(d.root, swap), ids = idsOf(root);
  const flowGone = (e: XElement): boolean => e.ns === NS.bpmn && e.local === 'sequenceFlow'
    && (!ids.has(attr(e, 'sourceRef') ?? '') || !ids.has(attr(e, 'targetRef') ?? ''));
  const dangling = (e: XElement): boolean => e.ns === NS.bpmndi && (e.local === 'BPMNShape' || e.local === 'BPMNEdge')
    && !ids.has(attr(e, 'bpmnElement') ?? '');
  const clean = (gone: (e: XElement) => boolean) => { const f = (e: XElement): XElement | null => (gone(e) ? null : prune(e, f)); return f; };
  root = prune(root, clean(flowGone));
  ids = idsOf(root);
  root = prune(root, clean(dangling));
  return root === d.root ? d : { ...d, root };
}
