/** @calc-zone stress */
import { caseDiscountRate } from '../canonical';
import type { Ctx } from '../ctx';
import { makeInputs } from '../inputs';
import { timeFor } from '../time';
import { thinAggregate } from '../time/thin';
import type { CaseState } from '../types/state';
import { lceLoops } from './lce';
import { MCS_DRIVER_ORDER, mcsBaseValue, mcsDrawOne, mcsMarginalBand, mcsSpec, type McsSample } from './mcsDrivers';
import { mcsOf } from './modelState';
import { mulberry32, quantile } from './numerics';
import { activeCurve } from './overlay';
import { modelRaw } from './raw';

export interface McsStats { p10: number; p50: number; p90: number }
/** `pSavNeg` = P(horizon-end-year savings < 0): a different quantity from the decision engine's P(net benefit < 0). */
export interface McsResult {
  n: number; seed: number; rho: number;
  stats: { savY3: McsStats; runY3: McsStats; npv: McsStats; paybackMonths: McsStats; pSavNeg: number };
  tornado: { id: string; label: string; lo: number; hi: number; swing: number }[];
  convergence: { n: number; p50: number }[];
}

/** The case as one draw sees it: sampled ramps, rate / token scales, supervising hours and acceptance rates (state is cloned, never mutated). */
function drawCtx(c: Ctx, sample: McsSample): Ctx {
  const s: CaseState = { ...c.s, dom: { ...c.s.dom, values: { ...c.s.dom.values } }, MODEL: { ...c.s.MODEL } };
  for (const id of ['y1Ramp', 'y2Ramp', 'y3Ramp']) s.dom.values[id] = String(sample[id]);
  if (s.MODEL.FLAGS.sup && s.MODEL.SUP.provision === 'constrained') s.MODEL.SUP = { ...s.MODEL.SUP, hoursPerPeriod: sample.supCapacity as number };
  if (s.MODEL.FLAGS.lce) {
    const loops = lceLoops(c).loops;
    if (loops.length) {
      const baseP = mcsBaseValue(c, 'p'), ratio = baseP > 0 ? (sample.p as number) / baseP : 1;
      s.MODEL.LCE = { ...s.MODEL.LCE, loops: loops.map((l) => ({ ...l, pAccept: Math.min(1, Math.max(0.05, l.pAccept * ratio)) })) };
    }
  }
  const baseRate = mcsBaseValue(c, 'dayRate'), baseTok = mcsBaseValue(c, 'tokenPrice');
  return { s, inp: makeInputs(s), a: c.a, rateScale: baseRate > 0 ? (sample.dayRate as number) / baseRate : 1,
    tokenScale: baseTok > 0 ? (sample.tokenPrice as number) / baseTok : 1 };
}

/**
 * One evaluation of the model on a sample: horizon-end savings and run cost, NPV at the case rate, payback (the thin pass of the Time Engine over the
 * kernel).
 */
export function mcsEvaluate(c: Ctx, sample: McsSample) {
  const dc = drawCtx(c, sample), m = modelRaw(dc);
  const T = thinAggregate(timeFor(dc, { mode: 'full', curveModelId: activeCurve(dc), model: m }).K, caseDiscountRate(dc)), last = T.years[T.years.length - 1];
  return { savY3: last?.savings ?? 0, runY3: last?.totalRunCost ?? 0, npv: T.npv, paybackMonths: T.payback === null ? m.horizon * 12 : T.payback };
}

const quantiles = (arr: number[]): McsStats => {
  const s = arr.slice().sort((a, b) => a - b);
  return { p10: quantile(s, 0.1), p50: quantile(s, 0.5), p90: quantile(s, 0.9) };
};

/** Tornado: each driver alone across its own marginal P10-P90 with the others at base, ranked by swing on horizon-end savings. */
export function mcsTornado(c: Ctx, bases: McsSample) {
  return MCS_DRIVER_ORDER.map((id) => {
    const [lo, hi] = mcsMarginalBand(c, id, bases[id] as number);
    const a = mcsEvaluate(c, { ...bases, [id]: lo }).savY3, b = mcsEvaluate(c, { ...bases, [id]: hi }).savY3;
    return { id, label: mcsSpec(c, id).label ?? id, lo: Math.min(a, b), hi: Math.max(a, b), swing: Math.abs(b - a) };
  }).sort((a, b) => b.swing - a.swing);
}

/** Defaults and bounds of the P4 settings: 2000 draws (100..20000), seed 20260728, organisational correlation ρ 0.35 (0..1). */
export const MCS_DRAWS_DEFAULT = 2000, MCS_DRAWS_MIN = 100, MCS_DRAWS_MAX = 20000, MCS_SEED_DEFAULT = 20260728, MCS_RHO_DEFAULT = 0.35;

/** The stochastic layer (P4): n correlated draws, seeded; same results as the legacy runMcs for the same seed. */
export function runMcs(c: Ctx, nIn?: number, seedIn?: number): McsResult {
  const mc = mcsOf(c.s.MODEL);
  const n = Math.max(MCS_DRAWS_MIN, Math.min(MCS_DRAWS_MAX, nIn || mc.draws || MCS_DRAWS_DEFAULT));
  const seed = Math.max(1, Math.round(seedIn != null ? seedIn : mc.seed || MCS_SEED_DEFAULT));
  const rho = Math.max(0, Math.min(1, mc.rho != null ? mc.rho : MCS_RHO_DEFAULT));
  const rng = mulberry32(seed), bases: McsSample = {};
  MCS_DRIVER_ORDER.forEach((id) => { bases[id] = mcsBaseValue(c, id); });
  const sav: number[] = new Array(n), run: number[] = new Array(n), npv: number[] = new Array(n), pay: number[] = new Array(n);
  const marks = [Math.floor(n * 0.1), Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
  const convergence: McsResult['convergence'] = [];
  for (let i = 0; i < n; i++) {
    const r = mcsEvaluate(c, mcsDrawOne(c, rng, bases, rho));
    sav[i] = r.savY3; run[i] = r.runY3; npv[i] = r.npv; pay[i] = r.paybackMonths;
    if (marks.includes(i + 1)) convergence.push({ n: i + 1, p50: quantiles(sav.slice(0, i + 1)).p50 });
  }
  return { n, seed, rho, convergence, tornado: mcsTornado(c, bases),
    stats: { savY3: quantiles(sav), runY3: quantiles(run), npv: quantiles(npv), paybackMonths: quantiles(pay), pSavNeg: sav.filter((v) => v < 0).length / n } };
}
