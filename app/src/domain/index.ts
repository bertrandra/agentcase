import { engineNow } from './canonical';
import { makeCtx, type Ctx } from './ctx';
import { model } from './model/overlay';
import { computeGlassCeiling } from './model/ceiling';
import { phaseScope } from './scope';
import type { CaseState } from './types/state';

export { makeCtx, type Ctx } from './ctx';
export { activeArtefacts, regActive } from './scope';
export { SDLC_ARTEFACTS, REG_ARTEFACTS, PHASES, LOCATIONS } from './catalog';
export { model } from './model/overlay';
export { modelRaw } from './model/raw';
export { engineNow, paybackMonthsCanonical, npvCanonical } from './canonical';
export type { CaseState } from './types/state';
export type { ModelResult } from './types/model';

/** Phase-scope averages of a case context. */
export const phaseScopeOf = (c: Ctx) => phaseScope(c.a, c.s);

/** One call that computes everything the headline needs from a case. */
export function computeCase(s: CaseState) {
  const c = makeCtx(s);
  const eng = engineNow(c);
  const d = s.MODEL?.CASE?.discountRate;
  return { model: model(c), headline: eng.headline(), payback: eng.payback(), npv: eng.npv(typeof d === 'number' ? d : 0.08),
    phaseScope: phaseScope(c.a, c.s), glassCeiling: computeGlassCeiling(c) };
}
