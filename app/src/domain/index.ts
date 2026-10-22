import { caseDiscountRate, engineNow } from './canonical';
import { makeCtx, type Ctx } from './ctx';
import { costReduction } from './economics/costReduction';
import { velocityUpliftPct } from './verifyB/velocityUplift';
import { horizonYears } from './model/horizonYears';
import { model } from './model/overlay';
import { computeGlassCeiling } from './model/ceiling';
import { phaseScope } from './scope';
import type { CaseState } from './types/state';

export { makeCtx, type Ctx } from './ctx';
export { activeArtefacts, regActive } from './scope';
export { phaseRows, phasesForScope, scopeSummary, regOfActiveNorms, type PhaseRow } from './scopeView';
export { ceilingImpact, type CeilingImpact } from './ceilingImpact';
export { lifecycleWeight } from './lifecycle';
export { SDLC_ARTEFACTS, REG_ARTEFACTS, PHASES, LOCATIONS } from './catalog';
export { model } from './model/overlay';
export { modelRaw } from './model/raw';
export { engineNow, paybackMonthsCanonical, npvCanonical, caseDiscountRate } from './canonical';
export type { CaseState } from './types/state';
export type { ModelResult } from './types/model';

/** Phase-scope averages of a case context. */
export const phaseScopeOf = (c: Ctx) => phaseScope(c.a, c.s);

/** One call that computes everything the headline needs from a case. */
export function computeCase(s: CaseState) {
  const c = makeCtx(s);
  const eng = engineNow(c), rate = caseDiscountRate(c);
  const hy = horizonYears(c), last = hy.sav.length - 1;
  return { model: model(c), endYear: { savings: hy.sav[last] ?? 0, run: hy.run[last] ?? 0, index: last + 1 }, headline: eng.headline(rate), payback: eng.payback(), npv: eng.npv(rate),
    costReduction: costReduction(c), velocityPct: velocityUpliftPct(c), phaseScope: phaseScope(c.a, c.s), glassCeiling: computeGlassCeiling(c) };
}
