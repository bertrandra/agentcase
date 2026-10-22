/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { engineNow } from '../canonical';
import { lceModel } from './lce';
import { doraOf } from './modelState';
import { model } from './overlay';
import { supMaxVfte } from './supervision';

/** Horizon-end run-team FTE of the engine (legacy teEndYearRow().runTeamFteEnd). */
export const engineEndRunTeam = (c: Ctx): { years: number; runTeamFteEnd: number } => {
  const e = engineNow(c);
  return { years: e.horizonYears, runTeamFteEnd: e.year(e.horizonYears).runTeamFteEnd };
};

/** Peak supervisor requirement: the last flat year, and past a 3-year horizon the engine's horizon-end run team. */
export function supPeakNeeded(c: Ctx, esupNeeded: number[]): number {
  let peak = esupNeeded.length ? (esupNeeded[esupNeeded.length - 1] as number) : 0;
  try { const e = engineEndRunTeam(c); if (e.years > 3) peak = Math.max(peak, e.runTeamFteEnd); } catch { /* keep the flat peak */ }
  return peak;
}

/**
 * Supervisor headcount a Constrained switch-on starts from (the non-binding boundary), measured with provisioning so nothing is capped.
 * Like the legacy seeding, only the model's own last-year run team counts (the engine is not consulted past a 3-year horizon here).
 */
export function supSeedHeadcount(c: Ctx): number {
  const s = { ...c.s, MODEL: { ...c.s.MODEL, SUP: { ...c.s.MODEL.SUP, provision: 'provisioned' } } };
  const peak = model({ ...c, s }).yearRunAgenticETP;
  return Math.max(1, Math.ceil(peak.length ? (peak[peak.length - 1] as number) : 0));
}

/** Full P3 read-out, Y1..Y3 (legacy supModel()). */
export function supModel(c: Ctx) {
  const sup = c.s.MODEL.SUP, m = model(c), baseEtp = m.base.etp;
  const constrained = !!(c.s.MODEL.FLAGS.sup && sup.provision === 'constrained');
  const esup = Math.max(0, sup.supervisors || 0);
  const vMax = [0, 1, 2].map((i) => supMaxVfte(c, esup, baseEtp, i));
  const raw = m.yearAgentVfteRaw, eff = m.yearAgentVfte;
  return {
    provision: sup.provision, constrained, mode: sup.mode, esup, vMax, vfteRaw: raw, vfteEff: eff,
    esupNeeded: m.yearRunAgenticETP, runCost: m.yearRunAgenticCost,
    supervisorsToUnlock: Math.max(0, Math.ceil(supPeakNeeded(c, m.yearRunAgenticETP)) - esup),
  };
}

export interface DoraRow { derived: number | null; measured: number | null; delta: number | null; unit: string }
/** DORA read-outs pulled forward from P5: pure read-outs of P1/P3 state beside the client's measured values. */
export function doraReadout(c: Ctx) {
  const lc = c.s.MODEL.FLAGS.lce ? lceModel(c) : null, measured = doraOf(c.s.MODEL).measured;
  const e = engineNow(c), wd = model(c).wd, rpd = c.inp.p('runsPerDay');
  const deployFreq = e.year(e.horizonYears).agentVfteEnd * wd * Math.max(0, isNaN(rpd) ? 25 : rpd);
  const loops = c.s.MODEL.LCE.loops ?? [];
  const meanT = loops.length ? loops.reduce((t, l) => t + (l.tRev || 0), 0) / loops.length : 0;
  const row = (key: string, derived: number | null, unit: string): DoraRow => {
    const meas = typeof measured[key] === 'number' ? (measured[key] as number) : null;
    return { derived, measured: meas, delta: meas != null && derived != null ? meas - derived : null, unit };
  };
  return {
    deploymentFrequency: row('deployFreq', deployFreq, 'agent runs / yr (Y3)'),
    changeFailureRate: row('changeFailure', lc ? lc.escapePct : null, '% escape (P1)'),
    leadTimeForChange: row('leadTime', lc ? lc.weightedEN * meanT : null, 'hours / accepted artefact (P1 proxy — true CT is P5-owned, not yet modelled)'),
    timeToRestore: row('ttr', null, 'not modelled — direct input only (spec-carried for completeness)'),
  };
}
