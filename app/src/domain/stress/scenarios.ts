import { LOCATIONS } from '../catalog';
import type { Ctx } from '../ctx';
import { annualPaybackMonth } from '../economics/headline';
import { roiCanonical } from '../economics/roi';
import { rateFor, targetBlendedTJM, teamInCost } from '../location';
import { computeGlassCeiling } from '../model/ceiling';
import { blendedTokenCostPer1M } from '../tokens';

export type ScenLoc = 'asis' | 'target' | 'destination' | 'ramp';
export interface ScenOpts { ai: boolean; loc: ScenLoc; frPerYear: number }

/** Destination of the relocation scenarios (the `scenTargetLoc` dropdown; France when empty). */
export const scenTargetLocName = (c: Ctx): string => c.inp.v('scenTargetLoc') || 'France';

/** Blended day rate of one location, priced on the team rows staffed there (else the C1 rate). */
function locBlendedTJM(c: Ctx, loc: string): number {
  const res = c.s.teamIn.filter((r) => r.loc === loc);
  if (res.length) {
    let e = 0, cost = 0;
    res.forEach((r) => { e += r.etp; cost += r.etp * rateFor(c.s, r.loc, r.grade); });
    return e ? cost / e : rateFor(c.s, loc, 'C1');
  }
  return rateFor(c.s, loc, 'C1');
}
export function scenTargetTJM(c: Ctx): number {
  const rate = locBlendedTJM(c, scenTargetLocName(c));
  return isFinite(rate) && rate > 0 ? rate : targetBlendedTJM(c.s);
}

/** Generic scenario model (legacy scenarioModel): the flat annual model with the levers switched by `opts`. */
export function scenarioModel(c: Ctx, opts: Partial<ScenOpts>) {
  const o: ScenOpts = { ai: true, loc: 'target', frPerYear: 0, ...opts };
  const { inp, s } = c, base = teamInCost(s, inp), auto = inp.p('autoPotential');
  const ceiling = s.forceGlassCeiling ? inp.p('glassCeiling') : computeGlassCeiling(c);
  const eff = o.ai ? Math.min(100 - ceiling, auto) : 0;
  const horizon = parseInt(inp.v('horizon'), 10);
  const ramps = [inp.p('y1Ramp'), inp.p('y2Ramp'), inp.p('y3Ramp')];
  for (let y = 3; y < horizon; y++) ramps.push(ramps[ramps.length - 1] as number);
  if (ramps.length > horizon) ramps.length = Math.max(1, horizon);   // horizons 1–2 (legacy v18.13)
  const wd = inp.p('workdays'), tokenCost = blendedTokenCostPer1M(s), tokensPerArt = inp.p('tokensPerArt'), infra = inp.p('infra');
  const setupTotal = inp.p('setupTooling') + inp.p('setupTraining') + inp.p('setupCoaching') + inp.p('setupGov');
  const asisTJM = base.cost / (base.etp * wd), tgtTJM = targetBlendedTJM(s), tgtRateTJM = scenTargetTJM(c);
  const fill = (v: number) => new Array<number>(horizon).fill(v);
  const dayRateByYear = o.loc === 'asis' ? fill(asisTJM) : o.loc === 'destination' ? fill(tgtRateTJM)
    : o.loc === 'ramp' ? Array.from({ length: horizon }, (_, k) => asisTJM + (tgtRateTJM - asisTJM) * Math.min(1, (o.frPerYear / 100) * (k + 1)))
      : fill(tgtTJM);
  const yearETP = ramps.map((r) => base.etp * (1 - ((r / 100) * eff) / 100));
  const yearAgentVfte = ramps.map((r) => base.etp * (((r / 100) * eff) / 100));
  const yearTeamCost = yearETP.map((e, i) => e * (dayRateByYear[i] as number) * wd);
  let runsPerDay = inp.p('runsPerDay'); if (isNaN(runsPerDay)) runsPerDay = 25; runsPerDay = Math.max(0, runsPerDay);
  const yearToken = yearAgentVfte.map((v) => (v * wd * runsPerDay * tokensPerArt) / 1e6 * tokenCost);
  const infraYear = infra * 12, mode = inp.v('runSizeMode') || 'hybrid';
  const num = (id: string, d: number) => { const v = parseFloat(inp.v(id)); return isNaN(v) ? d : v; };
  const sMin = num('runFloorMin', 0.5), sPct = num('runFloorPct', 4), sOps = num('runOpsPerAgent', 0.15);
  const sLegacy = Math.max(0.5, base.etp * 0.06 + 0.5 + base.etp * 0.04);
  const runAgenticETPYr = yearAgentVfte.map((v) => (!o.ai ? 0 : mode === 'legacy' ? sLegacy : (v > 1e-4 ? Math.max(sMin, (base.etp * sPct) / 100) : 0) + v * sOps));
  const runAgenticCost = yearTeamCost.map((_, i) => (runAgenticETPYr[i] as number) * (dayRateByYear[i] as number) * 1.15 * wd);
  const setup = o.ai || o.loc === 'ramp' ? setupTotal : 0;
  const yearRun = yearTeamCost.map((tc, i) => tc + (o.ai ? (yearToken[i] as number) : 0) + (o.ai ? infraYear : 0) + (runAgenticCost[i] as number));
  const baselineRun = base.cost, yearSav = yearRun.map((r) => baselineRun - r), totBen = yearSav.reduce((a, b) => a + b, 0);
  const roi = roiCanonical(totBen - setup, setup), pbMonth = annualPaybackMonth(setup, yearSav);
  return { opts: o, base, setup, dayRateByYear, yearETP, yearAgentVfte, yearTeamCost, yearToken, yearRun, yearSav, baselineRun, totBen, roi, pbMonth, horizon, tgtTJM, asisTJM, tgtRateTJM };
}
export type ScenarioResult = ReturnType<typeof scenarioModel>;

export interface Scenario { key: 'asis' | 'ai' | 'loc' | 'ramp' | 'ailoc' | 'aidst'; label: string; color: string; m: ScenarioResult }

/** The six scenarios, in display order. */
export function scenarioSet(c: Ctx): Scenario[] {
  const frPer = c.inp.p('scenFrPerYear'), dst = scenTargetLocName(c);
  return [
    { key: 'asis', label: 'AS-IS', color: '#566074', m: scenarioModel(c, { ai: false, loc: 'asis' }) },
    { key: 'ai', label: 'AI only', color: '#0a6e9c', m: scenarioModel(c, { ai: true, loc: 'asis' }) },
    { key: 'loc', label: 'Location only', color: '#b04600', m: scenarioModel(c, { ai: false, loc: 'target' }) },
    { key: 'ramp', label: `Ramp to ${dst} (${frPer}%/yr)`, color: '#B5651D', m: scenarioModel(c, { ai: false, loc: 'ramp', frPerYear: frPer }) },
    { key: 'ailoc', label: 'AI + Location', color: '#006e79', m: scenarioModel(c, { ai: true, loc: 'target' }) },
    { key: 'aidst', label: `AI + 100% ${dst}`, color: '#0058AB', m: scenarioModel(c, { ai: true, loc: 'destination' }) },
  ];
}
export const SCENARIO_DESTINATIONS = LOCATIONS.map((l) => ({ name: l.name, cls: l.cls }));
