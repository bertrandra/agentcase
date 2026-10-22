/** @calc-zone time-engine */
import type { Ctx } from '../ctx';
import { supCeilVfte } from '../model/supervision';
import type { ModelResult } from '../types/model';
import { ADAPTERS, rampAt, yearOf, type CurveK } from './adapters';
import { fitCurveCached } from './fit';
import { enginePts } from './spline';

/** Constants captured from a (raw) model so the engine is a pure function of them (legacy buildK). */
export interface K extends CurveK {
  ctx: Ctx; mode: string; scenarioId: string; calculationVersion: string; horizonYears: number; horizonMonths: number;
  baseEtp: number; baselineRunMonth: number; eff: number; wdMonth: number; dayRateTarget: number; dayRateAsIs: number; rateMode: string;
  frPerYear: number; runsPerDay: number; tokensPerArt: number; tokenUnitCost: number; infraMonth: number; setupTotal: number;
  setupProfileMonths: number; runSizeMode: string; runFloorMin: number; runFloorPct: number; runOpsPerAgent: number; runTeamFactor: number;
  legacyRunFte: number; vTaxRate: number; loopExtRate: number; complianceTaxRate: number; aiActive: boolean; maturityBounds: number[];
  A: { baselineRun: number; yearETP: number[]; yearAgentVfte: number[]; yearTeamCost: number[]; yearToken: number[]; yearInfraEff: number[];
       yearRunAgenticCost: number[]; khRunYr: number[]; ktAvoidYr: number[]; vTaxYr: number[]; loopExtYr: number[] };
  inputHash: string;
}
/** Case-level switches a scenario overrides on the frozen constants (AI on/off, the day-rate path, the setup); the monthly arithmetic is untouched. */
export type Levers = Partial<Pick<K, 'eff' | 'aiActive' | 'rateMode' | 'frPerYear' | 'dayRateTarget' | 'infraMonth' | 'setupTotal' | 'vTaxRate' | 'loopExtRate' | 'complianceTaxRate'>>;
export interface BuildOpts { mode?: string; curveModelId?: string; scenarioId?: string; levers?: Levers }

export function buildK(c: Ctx, m: ModelResult, opts: BuildOpts = {}): K {
  const conv = m.conv, num = (id: string, d: number) => { const v = parseFloat(c.inp.v(id)); return isNaN(v) ? d : v; };
  const K: K = {
    ctx: c, mode: opts.mode || 'legacy', curveModelId: opts.curveModelId || 'legacy.flatAnnual', scenarioId: opts.scenarioId || 'base',
    calculationVersion: 'agentcase.timeengine.v1', horizonYears: m.horizon, horizonMonths: m.horizon * 12, ramps: m.ramps.slice(),
    baseEtp: m.base.etp, baselineRunMonth: m.baselineRun / 12, eff: m.eff, wdMonth: m.wd / 12, dayRateTarget: m.tgtTJM, dayRateAsIs: m.blendedTJM,
    rateMode: 'target', frPerYear: 0, runsPerDay: num('runsPerDay', 25), tokensPerArt: m.tokensPerArt, tokenUnitCost: m.tokenCost,
    infraMonth: m.infraYear / 12, setupTotal: m.setupTotal, setupProfileMonths: 6, runSizeMode: c.inp.v('runSizeMode') || 'hybrid',
    runFloorMin: num('runFloorMin', 0.5), runFloorPct: num('runFloorPct', 4), runOpsPerAgent: num('runOpsPerAgent', 0.15), runTeamFactor: num('runTeamFactor', 1),
    legacyRunFte: Math.max(0.5, m.base.etp * 0.06 + 0.5 + m.base.etp * 0.04), vTaxRate: conv.vTaxRate || 0, loopExtRate: conv.loopExtRate || 0,
    complianceTaxRate: num('complianceTaxPct', 0) / 100, aiActive: true,
    rampCapPct: m.conv.ctx.rampCapPct || 100, maturityBounds: c.s.MATURITY_MAP?.rampBounds?.length ? c.s.MATURITY_MAP.rampBounds : [0, 25, 55, 80],
    A: { baselineRun: m.baselineRun, yearETP: m.yearETP.slice(), yearAgentVfte: m.yearAgentVfte.slice(), yearTeamCost: m.yearTeamCost.slice(),
         yearToken: m.yearToken.slice(), yearInfraEff: m.yearInfraEff.slice(), yearRunAgenticCost: m.yearRunAgenticCost.slice(), khRunYr: conv.khRunYr.slice(),
         ktAvoidYr: conv.ktAvoidYr.slice(), vTaxYr: conv.vTaxYr.slice(), loopExtYr: conv.loopExtYr.slice() },
    inputHash: '',
  };
  if (opts.levers) Object.assign(K, opts.levers);
  const fam = ADAPTERS[K.curveModelId]?.family;
  if (fam === 'logistic' || fam === 'gompertz' || fam === 'bass') K[fam] = fitCurveCached(fam, K.ramps, K.rampCapPct);
  else if (fam === 'spline') K.spline = { points: enginePts(c) };
  const rnd = (x: number) => Math.round(x);
  K.inputHash = 'te1:' + [K.curveModelId, K.horizonMonths, K.baseEtp, K.eff, K.baselineRunMonth, K.dayRateTarget, K.setupTotal, K.ramps.join(','),
    m.yearSav.map(rnd).join(','), K.spline ? 'sp:' + K.spline.points.map((p) => rnd(p.t) + ':' + rnd(p.a)).join(',') : '', ...(opts.levers ? [JSON.stringify(opts.levers)] : [])].join('|');
  return K;
}

export const aAt = (arr: number[] | undefined, y: number): number => (arr && arr.length ? (arr[Math.min(arr.length - 1, y)] as number) : 0);

export function runTeamSizing(v: number, K: K): number {
  if (!K.aiActive) return 0;
  if (K.runSizeMode === 'legacy') return K.legacyRunFte;
  return (v > 1e-4 ? Math.max(K.runFloorMin, (K.baseEtp * K.runFloorPct) / 100) : 0) + v * K.runOpsPerAgent;
}

export interface Econ {
  t: number; y: number; r: number; humanFte: number; agentVfte: number; agentVfteRaw: number; runTeamFte: number; teamCost: number; tokenCost: number;
  infraCost: number; runTeamCost: number; khCost: number; ktAvoid: number; vTax: number; loopExt: number; compTax: number; setupCost: number;
  totalRun: number; grossSav: number; netSav: number;
}

/** The single source of the monthly arithmetic (legacy econ()): pointwise economics from the adoption level r. */
export function econ(t: number, K: K): Econ {
  const y = yearOf(t, K), A = K.A, r = rampAt(t, K);
  const yearFrac = (t - 1) / 12;
  const dayRate = K.rateMode === 'target' ? K.dayRateTarget : K.dayRateAsIs + (K.dayRateTarget - K.dayRateAsIs) * Math.min(1, (K.frPerYear / 100) * yearFrac);
  const agentVfteRaw = K.baseEtp * (((r / 100) * K.eff) / 100);
  const agentVfte = supCeilVfte(K.ctx, agentVfteRaw, K.baseEtp, y);
  const humanFte = agentVfte === agentVfteRaw ? K.baseEtp * (1 - ((r / 100) * K.eff) / 100) : K.baseEtp - agentVfte;
  const hasAgents = agentVfte > 1e-4;
  const teamCost = humanFte * dayRate * K.wdMonth;
  const agentRuns = agentVfte * K.wdMonth * K.runsPerDay;
  const tokenCost = K.aiActive ? ((agentRuns * K.tokensPerArt) / 1e6) * K.tokenUnitCost : 0;
  const infraCost = K.runSizeMode === 'legacy' ? K.infraMonth : hasAgents ? K.infraMonth : 0;
  const khCost = hasAgents ? aAt(A.khRunYr, y) / 12 : 0;
  const runTeamFte = runTeamSizing(agentVfte, K);
  const runTeamCost = runTeamFte * dayRate * 1.15 * K.wdMonth * K.runTeamFactor;
  const setupCost = t <= K.setupProfileMonths ? K.setupTotal / K.setupProfileMonths : 0;
  const totalRun = teamCost + tokenCost + infraCost + runTeamCost + khCost;
  const rawSav = Math.max(0, K.baselineRunMonth - totalRun);
  const vTax = rawSav * K.vTaxRate, loopExt = rawSav * K.loopExtRate, compTax = rawSav * K.complianceTaxRate;
  const ktAvoid = hasAgents ? aAt(A.ktAvoidYr, y) / 12 : 0;
  const grossSav = K.baselineRunMonth - totalRun + ktAvoid - vTax - loopExt - compTax;
  return { t, y, r, humanFte, agentVfte, agentVfteRaw, runTeamFte, teamCost, tokenCost, infraCost, runTeamCost, khCost, ktAvoid, vTax, loopExt, compTax,
    setupCost, totalRun, grossSav, netSav: grossSav - setupCost };
}
