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

/** An end a link can have: an activity (its phase and sub-process) or a sub-process (its phase; it is its own sub-process). */
function nodeOf(d: XDocument, id: string): { phase: string; sub?: string } | undefined {
  const v = readProcess(d), a = v.activities.find((x) => x.id === id);
  if (a) return a.sub ? { phase: a.phase, sub: a.sub } : { phase: a.phase };
  const s = v.subProcesses?.find((x) => x.id === id);
  return s ? { phase: s.phase, sub: s.id } : undefined;
}

/** Why `source → target` cannot be linked, or null when it can. */
export function linkRefusal(d: XDocument, source: string, target: string): string | null {
  const a = nodeOf(d, source), b = nodeOf(d, target);
  if (!a || !b) return 'A link joins two activities.';
  if (source === target) return 'An activity cannot be linked to itself.';
  if (a.phase !== b.phase) {
    return `A link stays inside one phase (in BPMN a sequence flow does not leave its sub-process): ${source} is in ${a.phase}, ${target} in ${b.phase}.`;
  }
  const [s, t] = endsOf(d, source, target);
  if (s === t) return `${source} and ${target} are in the same sub-process ${s}: link them inside it.`;
  if (readProcess(d).flows.some((f) => !f.rework && f.source === s && f.target === t)) return `${s} is already linked to ${t}.`;
  return null;
}

/**
 * The ends a link `source → target` really joins, and its container (owner, 2026-11-04: a link to an activity of a sub-process is inherited by
 * the sub-process): two activities of one sub-process are linked inside it; otherwise each end in a sub-process is its sub-process.
 */
function endsOf(d: XDocument, source: string, target: string): [string, string, string] {
  const a = nodeOf(d, source)!, b = nodeOf(d, target)!;
  if (a.sub && a.sub === b.sub && a.sub !== source && b.sub !== target) return [source, target, a.sub];
  return [a.sub ?? source, b.sub ?? target, a.phase];
}

/** `process.addLink`: a sequence flow `source → target` in their phase, with its edge; the same document when refused (`linkRefusal`). */
export function addLink(d: XDocument, source: string, target: string): XDocument {
  if (linkRefusal(d, source, target)) return d;
  const [s, t, container] = endsOf(d, source, target);
  return { ...d, root: withLinks(d.root, readProcess(d), [{ source: s, target: t, container }]) };
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
