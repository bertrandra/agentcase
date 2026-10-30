/** @calc-zone process-model */
import { attr, kid, NS, type XElement } from '../xml';
import { compensationOf } from './eventViews';
import { readEvents } from './events';
import { readLoops } from './loops';
import { indexOf, isEventSub, TASK_KINDS } from './walk';

/**
 * How many times an activity's effort counts (one owner, `domain/process`; phase B5b). The engine multiplies the activity's effort by this factor:
 * - **volume** (F-B44, D-B21): a multi-instance activity counts its effort per item × its items (`ac:volume`, else a whole `loopCardinality`);
 * - **frequency** (F-B49): an activity of an event sub-process counts once per occurrence (`ac:frequency count`);
 * - **compensation** (F-B50): a rollback handler counts with the change-failure rate as probability.
 * An activity none of them applies to is absent (factor 1): the default process has none, so its figures are unchanged.
 */
export type FactorReason = 'volume' | 'frequency' | 'compensation';
export interface EffortFactor { factor: number; reasons: FactorReason[] }

const memo = new WeakMap<XElement, ReadonlyMap<string, EffortFactor>>();
export function effortFactors(defs: XElement): ReadonlyMap<string, EffortFactor> {
  const hit = memo.get(defs);
  if (hit) return hit;
  const out = new Map<string, EffortFactor>(), ix = indexOf(defs);
  // a document with no marker at all (the default process) is not read further
  if (!ix.nodes.some((n) => isEventSub(n.e) || attr(n.e, 'isForCompensation') === 'true' || kid(n.e, NS.bpmn, 'multiInstanceLoopCharacteristics'))) {
    memo.set(defs, out);
    return out;
  }
  const mul = (id: string, f: number, r: FactorReason): void => {
    const cur = out.get(id) ?? { factor: 1, reasons: [] };
    out.set(id, { factor: cur.factor * f, reasons: [...cur.reasons, r] });
  };
  // the tasks of an element: itself, or every task nested in it (a multi-instance or event sub-process)
  const inside = (c: string): string[] => ix.nodes.filter((n) => n.id && n.container === c).flatMap((n) => [n.id, ...inside(n.id)]);
  const tasks = (id: string): string[] => [id, ...inside(id)].filter((x) => TASK_KINDS.includes(ix.byId.get(x)?.e.local ?? ''));
  for (const m of readLoops(defs).multi.values()) for (const id of tasks(m.activity)) mul(id, m.items, 'volume');
  for (const s of readEvents(defs).eventSubs) if (s.frequency) for (const id of tasks(s.id)) mul(id, s.frequency.count, 'frequency');
  for (const c of compensationOf(defs)) mul(c.handler, c.probability, 'compensation');
  memo.set(defs, out);
  return out;
}
