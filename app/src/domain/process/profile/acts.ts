/** @calc-zone process-model */
import { TYPE_OF_TASK } from '../types';
import { attr, kids, NS, type XElement } from '../xml';
import { acOf, indexOf, numAttr, refOf, str, tasksOf } from './walk';

/**
 * What the extended-profile views need to know of each task, read the same way in an AgentCase file and in a foreign one (phase B5b): its type
 * (`ac:activity type`, else `ac:activityType`, else the task kind, F-B53), whether it is in scope (the task and its phase, `ac:inScope`), its
 * effort per item, its norm (the `categoryValue` it references) and its phase.
 */
export interface ActFact {
  id: string; name: string; element: string; type: string; inScope: boolean; effort: number; agent: boolean; phase?: string; norm?: string;
  /** a compensation handler (`isForCompensation="true"`, F-B50) */
  compensation: boolean;
}

const memo = new WeakMap<XElement, Map<string, ActFact>>();
/** The type of a task element: its `ac:activity type`, else `ac:activityType`, else its kind (`scriptTask` → Script…), else Human. */
export function typeOfTask(e: XElement): string {
  const x = acOf(e, 'activity');
  return (x ? attr(x, 'type') : undefined) ?? attr(e, 'ac:activityType') ?? TYPE_OF_TASK[e.local] ?? 'Human';
}

/** The facts of every task of a document, by id, in document order. */
export function activityFacts(defs: XElement): Map<string, ActFact> {
  const hit = memo.get(defs);
  if (hit) return hit;
  const ix = indexOf(defs), norms = new Map<string, string>();
  for (const c of kids(defs, NS.bpmn, 'category')) for (const v of kids(c, NS.bpmn, 'categoryValue')) norms.set(str(attr(v, 'id')), str(attr(v, 'value')));
  const out = new Map<string, ActFact>();
  for (const t of tasksOf(ix)) {
    const ph = t.phase ? ix.byId.get(t.phase)?.e : undefined, type = typeOfTask(t.e);
    const f: ActFact = { id: t.id, name: str(attr(t.e, 'name')), element: t.e.local, type,
      inScope: attr(t.e, 'ac:inScope') !== 'false' && (!ph || attr(ph, 'ac:inScope') !== 'false'),
      effort: numAttr(acOf(t.e, 'activity'), 'effort') ?? 0, agent: type === 'Agent' || attr(t.e, 'ac:agent') !== undefined,
      compensation: attr(t.e, 'isForCompensation') === 'true' };
    if (t.phase) f.phase = t.phase;
    const n = norms.get(refOf(t.e, 'categoryValueRef') ?? '');
    if (n !== undefined) f.norm = n;
    out.set(t.id, f);
  }
  memo.set(defs, out);
  return out;
}
