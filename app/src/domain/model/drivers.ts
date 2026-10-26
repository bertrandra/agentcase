/** @calc-zone time-engine @owner setup, effective-automation */
import type { Ctx } from '../ctx';
import { caseHorizonYears } from '../inputs';
import { engagementCoef, hriRampFactor } from '../engagement';
import { khMult } from '../knowledge';
import { lifecycleAutoPosture } from '../lifecycle';
import { setupBreakdown } from '../tuneB/setup';
import { phaseScope } from '../scope';
import { blendedTokenCostPer1M } from '../tokens';
import { computeGlassCeiling } from './ceiling';


/** Scalar drivers of the annual model: automation depth, ramps, tokens, setup. */
export function modelDrivers(c: Ctx) {
  const { inp, s } = c;
  const auto = inp.p('autoPotential');
  const ceiling = s.forceGlassCeiling ? inp.p('glassCeiling') : computeGlassCeiling(c);
  const cvx = engagementCoef(c), khM = khMult(c);
  const effCap = 100 * (1 - ceiling / 100);
  // v18.11: the human share is applied once, as the cap (autoPotential already excludes it)
  const eff = Math.min(effCap, Math.min(100, auto * lifecycleAutoPosture(s) * cvx.glassFactor * khM));
  const hriF = hriRampFactor(c);
  const ramps = [inp.p('y1Ramp'), inp.p('y2Ramp'), inp.p('y3Ramp')].map((r) => Math.min(cvx.rampCapPct, r * cvx.rampSpeed * hriF));
  // the one setup breakdown (tuneB/setup.ts): its lines add up to the setup total the economics use
  const sb = setupBreakdown(c), setupBase = sb.base, convChange = sb.change, khSetup = sb.knowledge;
  return {
    auto, ceiling, cvx, khM, effCap, eff, hriF, ramps, horizon: caseHorizonYears(inp), wd: inp.p('workdays'),
    tokenCost: blendedTokenCostPer1M(s, c.tokenScale), tokensPerArt: inp.p('tokensPerArt'), infra: inp.p('infra'),
    setupBase, convChange, khSetup, setupTotal: sb.total, scope: phaseScope(c.a, s),
  };
}
export type Drivers = ReturnType<typeof modelDrivers>;
