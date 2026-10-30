/** @calc-zone scope-automation */
import type { Context, Value } from './feel';
import { lifecycleBlend } from './lifecycle';
import { hasScopeRules, scopeRules, type ScopeRules } from './process/conditions';
import { scopeOf } from './process/scope';
import type { CaseState } from './types/state';

/**
 * The case parameters the scope rules of the process read (spec F-B51; phase B5b), and the activities those rules put out of scope. The
 * selection screens keep working: they set these parameters (norms, industry, regulatory inclusion, phases switched off, lifecycle stage).
 * Names a condition can use: `industry`, `norms`, `industries`, `regInclude`, `phasesOff`, `lifecycle` (the stage nearest the lifecycle
 * position when the lifecycle axis is on, else null), `values.<field>` and `checked.<box>` (the case's form).
 */
export function conditionContext(s: CaseState): Context {
  const k = scopeOf(s), norms = k.selectedNorms.map((n) => n.slice(n.indexOf(':') + 1));
  const industries = [...new Set(k.selectedNorms.filter((n) => n.includes(':')).map((n) => n.slice(0, n.indexOf(':'))))];
  let lifecycle: string | null = null;
  if (s.lifecycleUse) { const b = lifecycleBlend(s); lifecycle = (b.frac < 0.5 ? b.lo : b.hi).id; }
  const values: Record<string, Value> = { ...(s.dom?.values ?? {}) }, checked: Record<string, Value> = { ...(s.dom?.checked ?? {}) };
  return { industry: s.dom?.values?.industry ?? null, norms, industries, regInclude: k.regInclude, phasesOff: k.phaseOff, lifecycle, values, checked };
}

const memo = new WeakMap<object, { key: string; rules: ScopeRules }>();
/** The scope rules of the case's process evaluated on the case (memoised on the document and the context); none without a document. */
export function caseScopeRules(s: CaseState): ScopeRules | null {
  const d = s.BPMN as unknown as { root?: unknown } | undefined;
  if (!d || typeof d !== 'object' || !s.BPMN.root || !hasScopeRules(s.BPMN.root)) return null;
  const ctx = conditionContext(s), key = JSON.stringify(ctx), hit = memo.get(s.BPMN);
  if (hit && hit.key === key) return hit.rules;
  const rules = scopeRules(s.BPMN.root, ctx);
  memo.set(s.BPMN, { key, rules });
  return rules;
}
/** The activities the scope rules put out of scope (empty when the process has no rule). */
export const ruledOut = (s: CaseState): ReadonlySet<string> => caseScopeRules(s)?.ruledOut ?? NONE;
const NONE: ReadonlySet<string> = new Set();
