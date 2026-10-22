/** @calc-zone time-engine @owner baseline-cost, run-cost-per-year */
import type { Ctx } from '../ctx';
import { khRunAnnual } from '../knowledge';
import { targetBlendedTJM, teamInCost } from '../location';
import type { Drivers } from './drivers';
import { supApplyCeiling, supRunCostFor } from './supervision';

/** Workforce, run-cost and token trajectories over the three anchor years (flat-step model). */
export function modelTrajectory(c: Ctx, d: Drivers) {
  const { inp, s } = c;
  const base = teamInCost(s, inp), { ramps, eff, wd } = d;
  const yearETPRaw = ramps.map((r) => base.etp * (1 - ((r / 100) * eff) / 100));
  const yearAgentVfteRaw = ramps.map((r) => base.etp * (((r / 100) * eff) / 100));
  const sup = supApplyCeiling(c, yearAgentVfteRaw, base.etp);
  const yearAgentVfte = sup ? sup.vfte : yearAgentVfteRaw, yearETP = sup ? sup.etp : yearETPRaw;
  const PROD_FACTOR = s.COEF.prodFactor as number;
  const blendedTJM = base.etp * wd > 0 ? base.cost / (base.etp * wd) : 0;
  const tgtTJM = targetBlendedTJM(s, c.rateScale);
  const yearTeamCost = yearETP.map((e) => e * tgtTJM * wd);
  const baseArtMonth = Math.max(1, Math.round(base.etp * 6));
  const rampMax = Math.max(...ramps);
  let runsPerDay = inp.p('runsPerDay'); if (isNaN(runsPerDay)) runsPerDay = 25; runsPerDay = Math.max(0, runsPerDay);
  const agentRunsYear = yearAgentVfte.map((v) => v * wd * runsPerDay);
  const yearTokenM = agentRunsYear.map((r) => (r * d.tokensPerArt) / 1e6), yearToken = yearTokenM.map((M) => M * d.tokenCost);
  const infraYear = d.infra * 12;
  const rtf = inp.v('runTeamFactor'), runTeamF = rtf === '' ? 1 : parseFloat(rtf) || 0;
  const runMode = inp.v('runSizeMode') || 'hybrid';
  const num = (id: string, dflt: number) => { const v = parseFloat(inp.v(id)); return isNaN(v) ? dflt : v; };
  const rfMin = num('runFloorMin', 0.5), rfPct = num('runFloorPct', 4), rOps = num('runOpsPerAgent', 0.15);
  const legacyETP = Math.max(0.5, base.etp * 0.06 + 0.5 + base.etp * 0.04);
  const yearRunAgenticETP = yearAgentVfte.map((v) =>
    runMode === 'legacy' ? legacyETP : (v > 1e-4 ? Math.max(rfMin, (base.etp * rfPct) / 100) : 0) + v * rOps);
  const yearRunAgenticCost = supRunCostFor(c, yearRunAgenticETP, tgtTJM, wd, runTeamF);
  const yearInfraEff = yearAgentVfte.map((v) => (runMode === 'legacy' ? infraYear : v > 1e-4 ? infraYear : 0));
  const khRunYr = yearAgentVfte.map((v) => (v > 1e-4 ? khRunAnnual(c, tgtTJM, wd) : 0));
  const yearRun = yearTeamCost.map((tc, i) => tc + (yearToken[i] as number) + (yearInfraEff[i] as number) + (yearRunAgenticCost[i] as number) + (khRunYr[i] as number));
  return {
    base, sup, yearETPRaw, yearAgentVfteRaw, yearAgentVfte, yearETP, PROD_FACTOR, yearAgentCapacity: yearAgentVfte.map((v) => v * PROD_FACTOR),
    blendedTJM, tgtTJM, yearTeamCost, baseArtMonth, yearArtMonth: ramps.map((r) => (rampMax > 0 ? baseArtMonth * (r / rampMax) : 0)),
    agentRunsYear, yearTokenM, yearToken, infraYear, yearRunAgenticETP, yearRunAgenticCost, yearInfraEff, khRunYr, yearRun,
  };
}
export type Trajectory = ReturnType<typeof modelTrajectory>;
