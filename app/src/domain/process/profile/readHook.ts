/** @calc-zone process-model */
import { activitiesOf, type Sim } from '../readPhases';
import type { ActivityView, PhaseView } from '../readTypes';
import { attr, kids, NS, type XElement } from '../xml';
import { effortFactors } from './effort';
import { callsOf } from './library';
import { readLoops } from './loops';
import { acOf, indexOf } from './walk';

/**
 * What the extended profile adds to the typed activities the engine reads (phase B5b, one owner): the event sub-processes at the top of the
 * process join the Cross-cutting phase (F-B49: event-driven work instead of the ad-hoc bucket); each activity carries its effort factor (volume,
 * frequency, compensation: `effort.ts`); a call activity without its own effort takes the effort of the library entry it calls (F-B52).
 * A document without any of these gives back the same list (the default process).
 */
export function withProfile(defs: XElement, proc: XElement | undefined, phases: { view: PhaseView }[], acts: ActivityView[], sim: Sim): ActivityView[] {
  const cross = phases.find((p) => p.view.adHoc)?.view.id;
  const top = proc && cross !== undefined ? kids(proc, NS.bpmn, 'subProcess').filter((e) => attr(e, 'triggeredByEvent') === 'true') : [];
  const all = top.length ? [...acts, ...top.flatMap((s) => activitiesOf(s, sim, cross as string, attr(s, 'id') ?? ''))] : acts;
  const factors = effortFactors(defs), calls = all.some((a) => a.called !== undefined) ? callsOf(defs) : [];
  if (!factors.size && !calls.length) return all;
  return all.map((a) => {
    const f = factors.get(a.id), c = calls.find((x) => x.id === a.id && !x.own);
    if (!f && !c) return a;
    const out = { ...a };
    if (f) out.factor = f.factor;
    if (c) out.effort = c.effort;
    return out;
  });
}

/**
 * F-B46 (B5b): the internal iterations of a rework loop whose `ac:rework` (on `element`, its flow or boundary event) gives none: the bounded
 * loop of its agent activity (`standardLoopCharacteristics loopMaximum`). `current` when the attribute is written or no bounded loop applies.
 */
export function loopIterations(defs: XElement, element: string, current: number, activity: string | undefined): number {
  const loops = readLoops(defs).bounded;
  if (!loops.size || activity === undefined) return current;
  const e = indexOf(defs).byId.get(element)?.e, r = e ? acOf(e, 'rework') : undefined;
  if (r && attr(r, 'internalIterations') !== undefined) return current;
  return loops.get(activity)?.max ?? current;
}
