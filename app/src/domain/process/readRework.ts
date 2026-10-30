/** @calc-zone process-model */
import { extOf, num } from './readTypes';
import type { ActivityView, FlowView, PhaseView } from './readTypes';
import type { CatLoopPair } from './types';
import { attr, kid, kids, NS, type XElement } from './xml';

/**
 * Rework paths drawn as error boundary events (spec F-B47, decision D-B20): an `errorEventDefinition` boundary event attached to an activity (or
 * to a phase) carrying `<ac:rework probability costShare …/>`, whose outgoing sequence flow leads back to the activity (or phase) to rework.
 */
export interface BoundaryRework {
  id: string; name?: string; attachedTo: string; target: string; pair?: string; probability: number; costShare: number; internalIterations: number;
  activityA?: string; activityB?: string; note?: string;
}

const str = (v: string | undefined): string => v ?? '';

/** The error boundary events with an `ac:rework` of a container (the process or a phase sub-process), with the target of their outgoing flow. */
export function boundaryReworksIn(container: XElement): Omit<BoundaryRework, 'target'>[] {
  return kids(container, NS.bpmn, 'boundaryEvent').filter((e) => kid(e, NS.bpmn, 'errorEventDefinition') && extOf(e, 'rework')).map((e) => {
    const r = extOf(e, 'rework') as XElement, a = (k: string) => attr(r, k), out: Omit<BoundaryRework, 'target'> = {
      id: str(attr(e, 'id')), attachedTo: str(attr(e, 'attachedToRef')), probability: num(a('probability')) ?? 0, costShare: num(a('costShare')) ?? 0,
      internalIterations: num(a('internalIterations')) ?? 0,
    };
    const opt = { name: attr(e, 'name'), pair: a('pair'), activityA: a('activityA'), activityB: a('activityB'), note: a('note') };
    for (const [k, v] of Object.entries(opt)) if (v !== undefined) Object.assign(out, { [k]: v });
    return out;
  });
}

/** Each boundary rework with the target of the first sequence flow leaving it (none: the event is ignored, it reworks nothing). */
export function withTargets(events: Omit<BoundaryRework, 'target'>[], flows: FlowView[]): BoundaryRework[] {
  return events.flatMap((e) => {
    const f = flows.find((x) => x.source === e.id);
    return f ? [{ ...e, target: f.target }] : [];
  });
}

/** The loop pair a boundary rework stands for: from the phase of what it is attached to, back to the phase of its target. */
function pairOf(b: BoundaryRework, phases: PhaseView[], acts: ActivityView[]): CatLoopPair {
  const phaseOf = (id: string): string | null => (phases.some((p) => p.id === id) ? id : acts.find((a) => a.id === id)?.phase ?? null);
  const isAct = (id: string): boolean => acts.some((a) => a.id === id);
  const out: CatLoopPair = {
    id: b.pair ?? b.id, label: b.name ?? '', artA: b.activityA ?? (isAct(b.target) ? b.target : ''),
    artB: b.activityB ?? (isAct(b.attachedTo) ? b.attachedTo : ''),
    internalIter: b.internalIterations, extReworkPct: b.probability, extFrom: phaseOf(b.attachedTo), extTo: phaseOf(b.target), extCostShare: b.costShare,
  };
  if (b.note !== undefined) out.internalNote = b.note;
  return out;
}

/**
 * D-B20: the rework loops of a process. Boundary events when present, back flows otherwise: a boundary rework naming a back flow's pair
 * (`ac:rework pair`) replaces that loop in place; one naming no known pair is a loop of its own, after the back flows.
 */
export function mergeRework(backFlows: CatLoopPair[], boundary: BoundaryRework[], phases: PhaseView[], acts: ActivityView[]): CatLoopPair[] {
  if (!boundary.length) return backFlows;
  const pairs = boundary.map((b) => pairOf(b, phases, acts)), byId = new Map(pairs.map((p) => [p.id, p]));
  const known = new Set(backFlows.map((l) => l.id));
  return [...backFlows.map((l) => byId.get(l.id) ?? l), ...pairs.filter((p) => !known.has(p.id))];
}
