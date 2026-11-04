/** @calc-zone process-model */
import { deleteSubProcess } from './editSubDelete';
import { arrangeSub } from './editSubLayout';
import { fitShape, inRework, moveInto, repoint, same } from './editSubTree';
import { appendChild, editById, idsOf } from './editTree';
import { readProcess } from './read';
import { el, withAttrs, type XDocument } from './xml';
import { indent } from './xmlWrite';

/**
 * Sub-processes on the canvas (owner's request 2026-11-04: activities automated together form a sub-process; the model keeps its "automatable"
 * field, the sub-process is a BPMN grouping): an expanded `bpmn:subProcess` inside a phase, holding some of the phase's activities and the flows
 * between them. Its activities keep their phase and count as before (`readPhases` reads them with `sub`). A link between a member and an activity
 * outside goes to the sub-process (inherited: a sequence flow does not cross a sub-process's border); deleting the sub-process puts its activities
 * back in the phase and gives its links back to its first activities (no incoming link inside) and its last ones (no outgoing link inside).
 */
/** Why `ids` cannot form a sub-process (or join `sub`), or null. */
export function subRefusal(d: XDocument, ids: readonly string[], sub?: string): string | null {
  const v = readProcess(d), acts = ids.map((i) => v.activities.find((a) => a.id === i));
  if (!ids.length || acts.some((a) => !a)) return 'A sub-process groups activities.';
  const phase = sub ? v.subProcesses?.find((s) => s.id === sub)?.phase : acts[0]!.phase;
  if (!phase) return `${sub} is not a sub-process.`;
  if (acts.some((a) => a!.phase !== phase)) return 'A sub-process stays inside one phase: its activities are in the same phase.';
  if (acts.some((a) => a!.trigger !== undefined)) return 'An activity of an event sub-process cannot join a sub-process.';
  if (acts.some((a) => a!.sub && a!.sub !== sub)) return `${acts.find((a) => a!.sub)!.id} is already in a sub-process.`;
  if (sub && acts.every((a) => a!.sub === sub)) return 'Already in this sub-process.';
  const loop = acts.find((a) => inRework(v, a!.id));
  return loop ? `${loop.id} is part of a rework loop: it stays where it is.` : null;
}

/** `process.createSubProcess`: a sub-process of activities `ids` (one phase), their flows inside it, their outside links inherited. */
export function createSubProcess(d: XDocument, ids: readonly string[], name?: string): XDocument {
  if (subRefusal(d, ids)) return d;
  const v = readProcess(d), phase = v.activities.find((a) => a.id === ids[0])!.phase, used = idsOf(d.root);
  let n = (v.subProcesses?.length ?? 0) + 1;
  while (used.has(`Sub_${n}`)) n++;
  const id = `Sub_${n}`, set = new Set(ids);
  const inner = v.flows.filter((f) => f.container === phase && !f.rework && set.has(f.source) && set.has(f.target)).map((f) => f.id);
  const order = v.activities.filter((a) => set.has(a.id)).map((a) => a.id);
  let out = same(d, editById(d.root, phase, (p) => appendChild(p, indent(el('bpmn:subProcess', { id, name: name ?? `Sub-process ${n}` }), '  ', 3))));
  out = moveInto(out, [...order, ...inner], id);
  out = arrangeSub(out, id);
  return repoint(out, phase, new Map(ids.map((i) => [i, id])));
}

/** `process.addToSubProcess`: activity `id` (of the same phase) joins `sub`, beside its activities; its links follow the inheritance rule. */
export function addToSubProcess(d: XDocument, sub: string, id: string): XDocument {
  if (subRefusal(d, [id], sub)) return d;
  const v = readProcess(d), phase = v.activities.find((a) => a.id === id)!.phase;
  // its links with the sub-process become links inside it, with the sub-process's last (or first) activities
  const inner = v.flows.filter((f) => f.container === sub && !f.rework), names = v.activities.filter((a) => a.sub === sub).map((a) => a.id);
  const last = names.find((m) => !inner.some((f) => f.source === m)), first = names.find((m) => !inner.some((f) => f.target === m));
  const joined = v.flows.filter((f) => f.container === phase && !f.rework && ((f.source === sub && f.target === id) || (f.source === id && f.target === sub)));
  let out = same(d, joined.reduce((r, f) => editById(r, f.id, (e) => withAttrs(e, f.source === sub ? { sourceRef: last ?? sub } : { targetRef: first ?? sub })),
    d.root));
  out = moveInto(out, joined.map((f) => f.id), sub);
  out = repoint(out, phase, new Map([[id, sub]]));
  out = moveInto(out, [id], sub);
  return arrangeSub(out, sub);
}

/**
 * The activities `ids` of sub-process `sub` back in the phase: the flows between them stay with them, a flow between one of them and another
 * activity of the sub-process goes to the sub-process; a sub-process left empty goes, its links given back as `deleteSubProcess` does.
 */
export function leaveSubProcess(d: XDocument, sub: string, ids: readonly string[]): XDocument {
  const v = readProcess(d), s = v.subProcesses?.find((x) => x.id === sub);
  const set = new Set(ids.filter((i) => v.activities.some((a) => a.id === i && a.sub === sub)));
  if (!s || !set.size) return d;
  const rest = v.activities.filter((a) => a.sub === sub && !set.has(a.id));
  if (!rest.length) return deleteSubProcess(d, sub);
  const both = v.flows.filter((f) => f.container === sub && set.has(f.source) && set.has(f.target)).map((f) => f.id);
  const cross = v.flows.filter((f) => f.container === sub && !f.rework && set.has(f.source) !== set.has(f.target)).map((f) => f.id);
  let out = moveInto(d, [...set, ...both, ...cross], s.phase);
  out = repoint(out, s.phase, new Map(rest.map((a) => [a.id, sub])));
  return fitShape(out, sub);
}

export { deleteSubProcess, withoutEmptySubs } from './editSubDelete';

/** Activity `id` out of its sub-process (before it moves to another cell or phase); the same document when it is in none. */
export function outOfSub(d: XDocument, id: string): XDocument {
  const sub = readProcess(d).activities.find((a) => a.id === id)?.sub;
  return sub ? leaveSubProcess(d, sub, [id]) : d;
}
