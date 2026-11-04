/** @calc-zone process-model */
import { withLinks } from './bridge';
import { editWhere } from './editTree';
import { readProcess } from './read';
import { attr, NS, type XDocument } from './xml';

/**
 * The links (plain sequence flows) drawn and edited on the diagram's canvas (owner's request 2026-11-04): add a link from an activity to
 * another, move one end of a link to another activity, delete a link. A sequence flow stays inside its container (BPMN: it does not leave a
 * sub-process), so a link joins two activities of the same phase. Rework flows (their pair and parameters) are not edited here.
 */
export type LinkEnd = 'source' | 'target';

/** Why `source → target` cannot be linked, or null when it can. */
export function linkRefusal(d: XDocument, source: string, target: string): string | null {
  const v = readProcess(d), a = v.activities.find((x) => x.id === source), b = v.activities.find((x) => x.id === target);
  if (!a || !b) return 'A link joins two activities.';
  if (source === target) return 'An activity cannot be linked to itself.';
  if (a.phase !== b.phase) {
    return `A link stays inside one phase (in BPMN a sequence flow does not leave its sub-process): ${source} is in ${a.phase}, ${target} in ${b.phase}.`;
  }
  if (v.flows.some((f) => !f.rework && f.source === source && f.target === target)) return `${source} is already linked to ${target}.`;
  return null;
}

/** `process.addLink`: a sequence flow `source → target` in their phase, with its edge; the same document when refused (`linkRefusal`). */
export function addLink(d: XDocument, source: string, target: string): XDocument {
  if (linkRefusal(d, source, target)) return d;
  const v = readProcess(d), phase = v.activities.find((x) => x.id === source)!.phase;
  return { ...d, root: withLinks(d.root, v, [{ source, target, container: phase }]) };
}

/** `process.removeLink`: the plain flow `id` and its edge; the same document for an unknown id or a rework flow. */
export function removeLink(d: XDocument, id: string): XDocument {
  if (!readProcess(d).flows.some((f) => f.id === id && !f.rework)) return d;
  const root = editWhere(d.root, (e) => attr(e, 'id') === id || (e.ns === NS.bpmndi && e.local === 'BPMNEdge' && attr(e, 'bpmnElement') === id), () => null);
  return root === d.root ? d : { ...d, root };
}

/** Why the `end` of link `id` cannot move to activity `to`, or null when it can. */
export function reconnectRefusal(d: XDocument, id: string, end: LinkEnd, to: string): string | null {
  const f = readProcess(d).flows.find((x) => x.id === id && !x.rework);
  if (!f) return 'Only a plain link can be moved.';
  const s = end === 'source' ? to : f.source, t = end === 'target' ? to : f.target;
  return s === f.source && t === f.target ? 'The link already ends there.' : linkRefusal(removeLink(d, id), s, t);
}

/** `process.reconnectLink`: the `end` of link `id` moved to activity `to` (the flow redrawn between its new ends); the same document when refused. */
export function reconnectLink(d: XDocument, id: string, end: LinkEnd, to: string): XDocument {
  if (reconnectRefusal(d, id, end, to)) return d;
  const f = readProcess(d).flows.find((x) => x.id === id)!;
  return addLink(removeLink(d, id), end === 'source' ? to : f.source, end === 'target' ? to : f.target);
}
