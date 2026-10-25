/** @calc-zone aggregate-views */
import { evlModel, type EvalDate } from '../model/evidence';
import { evtModel } from '../model/evt';
import type { Ctx } from '../ctx';
import { npvOf } from '../economics/cashflow';
import { flowModel, flowMonthValue, flowRate } from '../model/flow';
import { lceModel } from '../model/lce';
import { mcsOf } from '../model/modelState';
import { supModel } from '../model/supView';
import { convergenceChecks } from '../pdc/verifConvergence';
import { perProduct, type AggProduct } from './aggStress';
import { consolidate } from './consolidate';
import type { PfStress } from './stressTypes';
import { keptMonths } from './timeline';
import type { Portfolio } from './types';

/**
 * Per-product status of the six Model-Engine phases (P1-P6) for the aggregate view. Every figure is read from the phase's own model on the product's
 * effective case (`lceModel`, `supModel`, `flowModel`, `evlModel`, `evtModel`); the roll-up lines count or add what is additive and leave the rest out.
 */
const ESCAPE_LIMIT = 5;

/** P4 — stochastic layer: flag, settings and, once the portfolio Monte Carlo has run, the product's P50 net benefit. */
export type StochasticRow = AggProduct & { on: boolean; draws: number; seed: number; rho: number; p50: number | null };
export function stochasticByProduct(pf: Portfolio, ids: string[], run: PfStress | null): { rows: StochasticRow[]; on: number } {
  const rows = perProduct(pf, ids, (c, p) => {
    const m = mcsOf(c.s.MODEL);
    return { on: !!c.s.MODEL.FLAGS.mcs, draws: m.draws, seed: m.seed, rho: m.rho, p50: run?.products.find((x) => x.id === p.id)?.stats.p50 ?? null };
  });
  return { rows, on: rows.filter((r) => r.on).length };
}

/** P1 — loop convergence: E[N], escape rate, loops above the escape limit and the CC-LC checks of the product. */
export type ConvergenceRow = AggProduct & { on: boolean; calibrated: boolean; loops: number; weightedEN: number; escapePct: number; reviewShare: number;
  above: number; checksPass: number; checksFail: number };
export function convergenceByProduct(pf: Portfolio, ids: string[]): { rows: ConvergenceRow[]; on: number; above: number; checksFail: number } {
  const rows = perProduct(pf, ids, (c) => {
    const m = lceModel(c), lc = convergenceChecks(c).filter((k) => k.id.startsWith('CC-LC'));
    return {
      on: !!c.s.MODEL.FLAGS.lce, calibrated: m.calibrated, loops: m.loops.length, weightedEN: m.weightedEN, escapePct: m.escapePct, reviewShare: m.reviewShare,
      above: m.loops.filter((l) => l.escapePct > ESCAPE_LIMIT).length, checksPass: lc.filter((k) => k.pass).length,
      checksFail: lc.filter((k) => !k.pass).length,
    };
  });
  return { rows, on: rows.filter((r) => r.on).length, above: rows.reduce((a, r) => a + r.above, 0), checksFail: rows.reduce((a, r) => a + r.checksFail, 0) };
}

/** P3 — supervision: provisioned or constrained, supervisors, capacity needed, run cost and agent vFTE at the horizon end. */
export interface SupervisionRow extends AggProduct { on: boolean; constrained: boolean; supervisors: number; needed: number; runCost: number; vfte: number;
  toUnlock: number }
export function supervisionByProduct(pf: Portfolio, ids: string[]): { rows: SupervisionRow[]; totals: Omit<SupervisionRow,
  keyof AggProduct | 'on' | 'constrained'> & { on: number; constrained: number } } {
  const rows = perProduct(pf, ids, (c): Omit<SupervisionRow, keyof AggProduct> => {
    const s = supModel(c), last = <T,>(a: T[]): T => a[a.length - 1] as T;
    return { on: !!c.s.MODEL.FLAGS.sup, constrained: s.constrained, supervisors: s.esup, needed: last(s.esupNeeded), runCost: last(s.runCost),
      vfte: last(s.vfteEff), toUnlock: s.supervisorsToUnlock };
  });
  const sum = (k: 'supervisors' | 'needed' | 'runCost' | 'vfte' | 'toUnlock'): number => rows.reduce((a, r) => a + r[k], 0);
  return { rows, totals: { on: rows.filter((r) => r.on).length, constrained: rows.filter((r) => r.constrained).length, supervisors: sum('supervisors'),
    needed: sum('needed'), runCost: sum('runCost'), vfte: sum('vfte'), toUnlock: sum('toUnlock') } };
}

/**
 * The product's time-to-market value on the portfolio calendar: its monthly value laid on its own months (month0 + 1 ..), cut at the portfolio horizon,
 * discounted by the kernel from calendar month 1 at the product's flow rate (annual compounding, the P5 rule). 0 for a product not planned.
 */
export function calendarFlowNpv(pf: Portfolio, id: string, c: Ctx, deltaTEff: number): number {
  const cons = consolidate(pf), v = cons.products.find((x) => x.id === id), L = cons.horizon, value = flowMonthValue(c, deltaTEff);
  if (!v || value === 0) return 0;
  const flow = new Array<number>(L).fill(0), kept = keptMonths(L, v.month0, v.run.rows.length);
  for (let t = 0; t < kept; t++) flow[v.month0 + t] = value;
  return npvOf(flow, flowRate(c), 'annual');
}

/**
 * P5 — flow and value: cycle time, compression, WIP (Little) and the sponsor-owned time-to-market value (null while no margin is given), on the
 * portfolio calendar (`calendarFlowNpv`), so the products add up to the portfolio's value.
 */
export type FlowRow = AggProduct & { on: boolean; ctAsis: number; ctNew: number; theta: number; wip: number; flowNpv: number | null };
export function flowByProduct(pf: Portfolio, ids: string[]): { rows: FlowRow[]; on: number; wip: number; flowNpv: number; valued: number } {
  const rows = perProduct(pf, ids, (c, p) => {
    const f = flowModel(c);
    return { on: f.on, ctAsis: f.ctAsis, ctNew: f.ctNew, theta: f.theta, wip: f.wip, flowNpv: f.hasMargin ? calendarFlowNpv(pf, p.id, c, f.deltaTEff) : null };
  });
  const valued = rows.filter((r) => r.flowNpv !== null);
  return { rows, on: rows.filter((r) => r.on).length, wip: rows.reduce((a, r) => a + r.wip, 0),
    flowNpv: valued.reduce((a, r) => a + (r.flowNpv as number), 0), valued: valued.length };
}

/** P6 — evidence ledger (at the evaluation date `now`): stage, grade A-D, and how many of the seven drivers stand on measured, benchmark or assumed
 * evidence. */
export type EvidenceRow = AggProduct & { on: boolean; stage: string; grade: string | null; score: number | null; meets: boolean | null; measured: number;
  benchmark: number; assumed: number };
export function evidenceByProduct(pf: Portfolio, ids: string[], now: EvalDate): { rows: EvidenceRow[]; on: number; measured: number; benchmark: number;
  assumed: number;
  worst: string | null } {
  const rows = perProduct(pf, ids, (c) => {
    const e = evlModel(c, null, now), n = (t: string): number => e.drivers.filter((d) => d.effectiveTier === t).length;
    return { on: e.on, stage: e.stage, grade: e.grade, score: e.score, meets: e.meetsExpectation, measured: n('MEASURED'), benchmark: n('BENCHMARK'),
      assumed: n('ASSUMPTION') };
  });
  const sum = (k: 'measured' | 'benchmark' | 'assumed'): number => rows.reduce((a, r) => a + r[k], 0), grades = rows.flatMap((r) => (r.grade ? [r.grade] : []));
  return { rows, on: rows.filter((r) => r.on).length, measured: sum('measured'), benchmark: sum('benchmark'), assumed: sum('assumed'),
    worst: grades.length ? grades.reduce((a, g) => (g > a ? g : a)) : null };
}

/** P2 — verification tax: mode, derived rate, weighted irreducible floor, structural ROI ceiling and the criticality classes in scope. */
export type VerificationRow = AggProduct & { on: boolean; net: boolean; rate: number; phi: number; rhoMax: number; classes: number };
export function verificationByProduct(pf: Portfolio, ids: string[]): { rows: VerificationRow[]; on: number; lowestRhoMax: number | null } {
  const rows = perProduct(pf, ids, (c) => {
    const e = evtModel(c);
    return { on: !!c.s.MODEL.FLAGS.evt, net: c.s.MODEL.EVT.mode === 'net', rate: e.rate, phi: e.phiWeighted, rhoMax: e.rhoMax, classes: e.classes.length };
  });
  return { rows, on: rows.filter((r) => r.on).length, lowestRhoMax: rows.length ? Math.min(...rows.map((r) => r.rhoMax)) : null };
}
