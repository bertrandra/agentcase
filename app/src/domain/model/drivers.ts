import type { Ctx } from '../ctx';
import { convChangeCost, engagementCoef, hriRampFactor } from '../engagement';
import { khMult, khSetupCost } from '../knowledge';
import { lifecycleAutoPosture } from '../lifecycle';
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
  const setupBase = inp.p('setupTooling') + inp.p('setupTraining') + inp.p('setupCoaching') + inp.p('setupGov');
  const convChange = convChangeCost(c), khSetup = khSetupCost(c);
  return {
    auto, ceiling, cvx, khM, effCap, eff, hriF, ramps, horizon: parseInt(inp.v('horizon'), 10), wd: inp.p('workdays'),
    tokenCost: blendedTokenCostPer1M(s, c.tokenScale), tokensPerArt: inp.p('tokensPerArt'), infra: inp.p('infra'),
    setupBase, convChange, khSetup, setupTotal: setupBase + convChange + khSetup, scope: phaseScope(c.a, s),
  };
}
export type Drivers = ReturnType<typeof modelDrivers>;
