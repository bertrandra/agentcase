/** @calc-zone process-model */
import { attr, el, kid, NS, text, textOf, type XDocument, type XElement } from '../xml';
import { setAc, replaceKids } from './ext';
import { ACTIVITY_RANK, editDoc, SUBPROCESS_RANK } from './tree';
import { acOf, indexOf, numAttr, str, TASK_KINDS, CONTAINERS } from './walk';

/**
 * Repetition (spec F-B44, F-B46, decision D-B21; phase B5b). `multiInstanceLoopCharacteristics` marks an activity repeated per item (per story,
 * test case, release, ticket): its volume is `ac:volume items per`, or a whole-number `loopCardinality`; the engine then counts effort per item ×
 * items (opt-in: without a multi-instance marker the lump effort applies, so the default process is unchanged). `standardLoopCharacteristics`
 * with `loopMaximum` / `testBefore` is a bounded loop: the agent's internal iterations ("codes, tests and fixes up to 3 times").
 */
export const PERIODS = ['day', 'week', 'sprint', 'month', 'quarter', 'release', 'year', 'project'] as const;
export type Period = (typeof PERIODS)[number];
export interface Volume { items: number; per: string; batchSize?: number; source?: string; date?: string }
export interface MultiInstance {
  activity: string; sequential: boolean; cardinality?: number; completion?: string; volume?: Volume;
  /** the items the effort is multiplied by: the volume, else the cardinality, else 1 */
  items: number;
}
export interface BoundedLoop { activity: string; max?: number; testBefore: boolean; condition?: string }
export interface LoopsView { multi: ReadonlyMap<string, MultiInstance>; bounded: ReadonlyMap<string, BoundedLoop> }

const LOOPS = ['standardLoopCharacteristics', 'multiInstanceLoopCharacteristics'] as const;
const exprText = (e: XElement, local: string): string | undefined => { const x = kid(e, NS.bpmn, local); return x ? textOf(x).trim() : undefined; };

function volumeOf(task: XElement): Volume | undefined {
  const v = acOf(task, 'volume'), items = numAttr(v, 'items');
  if (!v || items === undefined) return undefined;
  const out: Volume = { items, per: str(attr(v, 'per')) }, b = numAttr(v, 'batchSize');
  if (b !== undefined) out.batchSize = b;
  for (const k of ['source', 'date'] as const) { const x = attr(v, k); if (x !== undefined) out[k] = x; }
  return out;
}

const memo = new WeakMap<XElement, LoopsView>();
/** The multi-instance and bounded loops of every activity and sub-process of a document. */
export function readLoops(defs: XElement): LoopsView {
  const hit = memo.get(defs);
  if (hit) return hit;
  const multi = new Map<string, MultiInstance>(), bounded = new Map<string, BoundedLoop>();
  for (const n of indexOf(defs).nodes.filter((x) => TASK_KINDS.includes(x.e.local) || CONTAINERS.includes(x.e.local))) {
    const mi = kid(n.e, NS.bpmn, 'multiInstanceLoopCharacteristics'), sl = kid(n.e, NS.bpmn, 'standardLoopCharacteristics');
    if (mi) {
      const card = exprText(mi, 'loopCardinality'), c = card !== undefined && /^\d+(\.\d+)?$/.test(card) ? Number(card) : undefined;
      const vol = volumeOf(n.e), m: MultiInstance = { activity: n.id, sequential: attr(mi, 'isSequential') === 'true', items: vol?.items ?? c ?? 1 };
      if (c !== undefined) m.cardinality = c;
      const done = exprText(mi, 'completionCondition');
      if (done) m.completion = done;
      if (vol) m.volume = vol;
      multi.set(n.id, m);
    }
    if (sl) {
      const b: BoundedLoop = { activity: n.id, testBefore: attr(sl, 'testBefore') === 'true' }, max = numAttr(sl, 'loopMaximum');
      if (max !== undefined) b.max = max;
      const cond = exprText(sl, 'loopCondition');
      if (cond) b.condition = cond;
      bounded.set(n.id, b);
    }
  }
  const out = { multi, bounded };
  memo.set(defs, out);
  return out;
}

export interface MultiInput { sequential?: boolean; items: number; per: Period; batchSize?: number; source?: string; date?: string; completion?: string }
/** An activity made multi-instance with its volume (replaces its loop characteristics and its `ac:volume`). */
export function setMultiInstance(d: XDocument, activity: string, m: MultiInput): XDocument {
  const kids2 = [el('bpmn:loopCardinality', {}, [text(String(m.items))]), ...(m.completion ? [el('bpmn:completionCondition', {}, [text(m.completion)])] : [])];
  const mi = el('bpmn:multiInstanceLoopCharacteristics', { id: `${activity}_mi`, isSequential: m.sequential ? 'true' : 'false' }, kids2);
  const vol = el('ac:volume', { items: m.items, per: m.per, batchSize: m.batchSize, source: m.source, date: m.date });
  return editDoc(d, activity, (e) => replaceKids(setAc(e, 'volume', vol, ACTIVITY_RANK), LOOPS, mi, ACTIVITY_RANK));
}
/** The activity's multi-instance marker and volume removed (back to its lump effort). */
export const clearLoop = (d: XDocument, activity: string): XDocument =>
  editDoc(d, activity, (e) => replaceKids(setAc(e, 'volume', null, ACTIVITY_RANK), LOOPS, null, ACTIVITY_RANK));
/** A bounded loop on an activity or sub-process (`standardLoopCharacteristics loopMaximum testBefore`). */
export function setBoundedLoop(d: XDocument, id: string, max: number, testBefore = false): XDocument {
  const sl = el('bpmn:standardLoopCharacteristics', { id: `${id}_loop`, testBefore: testBefore ? 'true' : 'false', loopMaximum: max });
  return editDoc(d, id, (e) => replaceKids(e, LOOPS, sl, CONTAINERS.includes(e.local) ? SUBPROCESS_RANK : ACTIVITY_RANK));
}
