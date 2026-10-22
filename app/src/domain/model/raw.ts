/** @calc-zone time-engine */
import type { Ctx } from '../ctx';
import { engagementKey } from '../engagement';
import { hriEnabled, hriIndex } from '../engagement';
import { khCcByYear, khEnabled, ktAvoidedAnnual } from '../knowledge';
import type { ModelResult } from '../types/model';
import { modelDrivers } from './drivers';
import { loopExternalTotalRate } from './loops';
import { modelTrajectory } from './trajectory';
import { aiQualityTaxFactor, verificationTaxRate } from './vtax';

/** Annual flat-step model (legacy modelRaw()). Pure: reads only the case carried by `c`. */
export function modelRaw(c: Ctx): ModelResult {
  const d = modelDrivers(c), t = modelTrajectory(c, d), { base } = t;
  const baselineRun = base.cost;
  const ccYears = khCcByYear(c);
  const ktAvoidYr = ccYears.map((cc, i) => ((t.yearAgentVfte[i] as number) > 1e-4 ? ktAvoidedAnnual(c, base.etp, t.tgtTJM, cc) : 0));
  const vTaxRate = verificationTaxRate(c) * aiQualityTaxFactor(c);
  const vTaxYr = t.yearRun.map((r) => Math.max(0, baselineRun - r) * vTaxRate);
  const loopExtRate = loopExternalTotalRate(c);
  const loopExtYr = t.yearRun.map((r) => Math.max(0, baselineRun - r) * loopExtRate);
  const yearSav = t.yearRun.map((r, i) => baselineRun - r + (ktAvoidYr[i] as number) - (vTaxYr[i] as number) - (loopExtYr[i] as number));
  const cbdOn = !!c.s.MODEL.FLAGS?.cbd;
  const delta = cbdOn ? Math.max(0, Math.min(1, c.s.MODEL.CBD.driftRate || 0)) : 0;
  const drift = [0, 1, 2].map((k) => baselineRun * Math.pow(1 - delta, k + 1));
  const attributable = t.yearRun.map((r, i) => (drift[i] as number) - r + (ktAvoidYr[i] as number) - (vTaxYr[i] as number) - (loopExtYr[i] as number));
  return {
    base, auto: d.auto, ceiling: d.ceiling, eff: d.eff, ramps: d.ramps, horizon: d.horizon, blendedTJM: t.blendedTJM, tgtTJM: t.tgtTJM,
    setupTotal: d.setupTotal, yearETP: t.yearETP, yearAgentVfte: t.yearAgentVfte, yearETPRaw: t.yearETPRaw, yearAgentVfteRaw: t.yearAgentVfteRaw,
    yearAgentCapacity: t.yearAgentCapacity, PROD_FACTOR: t.PROD_FACTOR, yearTeamCost: t.yearTeamCost, yearToken: t.yearToken,
    yearTokenM: t.yearTokenM, agentRunsYear: t.agentRunsYear, infraYear: t.infraYear, yearRun: t.yearRun, yearSav, baselineRun,
    baseArtMonth: t.baseArtMonth, yearArtMonth: t.yearArtMonth, runAgenticETP: t.yearRunAgenticETP[2] as number,
    runAgenticCost: t.yearRunAgenticCost[2] as number, yearRunAgenticETP: t.yearRunAgenticETP, yearRunAgenticCost: t.yearRunAgenticCost,
    yearInfraEff: t.yearInfraEff, wd: d.wd, tokenCost: d.tokenCost, tokensPerArt: d.tokensPerArt, scope: d.scope,
    sup: t.sup ? { constrained: true, esup: t.sup.esup, vMax: t.sup.vMax, mode: c.s.MODEL.SUP.mode } : { constrained: false },
    cbd: { on: cbdOn, delta, yearBaselineDrift: drift, yearSavAttributable: attributable, wedge: yearSav.map((s, i) => s - (attributable[i] as number)) },
    conv: { ctxKey: engagementKey(c), ctx: d.cvx, khOn: khEnabled(c), khM: d.khM, khSetup: d.khSetup, khRunYr: t.khRunYr, ktAvoidYr, ccYears,
      vTaxRate, vTaxYr, loopExtRate, loopExtYr, hriOn: hriEnabled(c), hriF: d.hriF, hri: Math.round(hriIndex(c)), changeCost: d.convChange,
      setupBase: d.setupBase, setupBillable: d.setupTotal * d.cvx.setupBillable, setupAbsorbed: d.setupTotal * (1 - d.cvx.setupBillable), effCap: d.effCap },
  };
}
