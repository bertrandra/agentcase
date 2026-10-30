/** @calc-zone scope-automation */
import { bindingsOf, decidedParams, decisionsEl, type DecidedActivity, type DecidedParams, type ParamPatch } from './dmn';
import { conditionContext } from './scopeRules';
import type { CaseState } from './types/state';

/**
 * The decisions of the case's process applied to the case (spec F-B62; phase B7b): the business-rule tasks bound to a DMN decision give the
 * activities of their phase the AI authority and supervision split the decision returns, in the case context of the scope rules (industry, norms,
 * lifecycle…, `scopeRules.ts`) plus the activity. A rule task out of the case's scope applies nothing. A process without decisions (the default
 * process) is not read: every figure is unchanged.
 */
type Doc = { root?: unknown };
const memo = new WeakMap<object, { key: string; out: DecidedParams | null }>();

/** The parameters the case's decisions give its activities (null without decisions), memoised on the document, the context and the active rules. */
export function caseDecisions(s: CaseState, lists: readonly (readonly DecidedActivity[])[], active: (task: string) => boolean): DecidedParams | null {
  const d = s.BPMN as unknown as Doc | undefined;
  if (!d || typeof d !== 'object' || !s.BPMN.root || !decisionsEl(s.BPMN.root)) return null;
  const ctx = conditionContext(s), on = bindingsOf(s.BPMN.root).map((b) => b.task).filter(active), key = JSON.stringify([ctx, on]), hit = memo.get(s.BPMN);
  if (hit && hit.key === key) return hit.out;
  const out = decidedParams(s.BPMN.root, ctx, new Map(lists.flatMap((l) => l.map((a) => [a.id, a] as const))), active);
  memo.set(s.BPMN, { key, out });
  return out;
}

/** The activities with the decided parameters applied (the same list when nothing applies). */
export function withDecided<T extends DecidedActivity>(list: T[], d: DecidedParams | null): T[] {
  if (!d || !d.params.size) return list;
  return list.map((a) => { const p: ParamPatch | undefined = d.params.get(a.id); return p ? { ...a, ...p } : a; });
}
