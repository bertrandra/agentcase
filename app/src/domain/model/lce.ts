/** @calc-zone run-setup-taxes */
import { LOOP_PAIRS } from '../catalog';
import type { Ctx } from '../ctx';
import { targetBlendedTJM } from '../location';
import { blendedTokenCostPer1M } from '../tokens';
import type { LceLoopState } from '../types/state';

/** Bisection on a monotone function (legacy `bisect`). */
export function bisect(f: (x: number) => number, lo: number, hi: number, tol = 1e-9, maxIter = 200): number {
  let flo = f(lo); if (flo === 0) return lo;
  const fhi = f(hi); if (fhi === 0) return hi;
  void fhi;
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if (fm === 0 || (hi - lo) / 2 < tol) return mid;
    if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else { hi = mid; }
  }
  return (lo + hi) / 2;
}

/** F-LCE-1: truncated-geometric expected number of iterations. */
export function lceExpectedIter(p: number, nMax: number): number {
  if (!(p > 0)) return nMax;
  if (p >= 1) return 1;
  return (1 - Math.pow(1 - p, nMax)) / p;
}

export const lceEscapeRate = (p: number, nMax: number): number => Math.pow(1 - Math.min(1, Math.max(0, p)), nMax);

/** F-LCE-4: invert E[N](p) = kLegacy by bisection. */
export function lceCalibrateP(kLegacy: number, nMax: number) {
  const pmin = 0.05;
  if (kLegacy <= 1) return { p: 1, residual: Math.abs(lceExpectedIter(1, nMax) - Math.max(1, kLegacy)), clamped: false };
  if (kLegacy >= nMax) return { p: pmin, residual: Math.abs(lceExpectedIter(pmin, nMax) - kLegacy), clamped: true };
  const p = bisect((x) => lceExpectedIter(x, nMax) - kLegacy, pmin, 1, 1e-12, 200);
  return { p, residual: Math.abs(lceExpectedIter(p, nMax) - kLegacy), clamped: false };
}

/** Loops of the case, calibrated on demand (pure: the legacy function mutated MODEL.LCE). */
export function lceLoops(c: Ctx): { loops: LceLoopState[]; calibrated: boolean } {
  const lce = c.s.MODEL.LCE, nMax = lce.nMax || 5;
  const need = !Array.isArray(lce.loops) || lce.loops.length !== LOOP_PAIRS.length || (!lce.calibrated && !lce.built);
  if (!need) return { loops: lce.loops, calibrated: !!lce.calibrated };
  const loops = LOOP_PAIRS.map((lp) => {
    const cal = lceCalibrateP(lp.internalIter || 1, nMax);
    return { id: lp.id, pAccept: cal.p, tRev: 0, cGen: null, calibResidual: cal.residual, clamped: cal.clamped };
  });
  return { loops, calibrated: loops.every((l) => !l.clamped) };
}

export function lceModel(c: Ctx) {
  const { loops: state, calibrated } = lceLoops(c);
  const lce = c.s.MODEL.LCE, nMax = lce.nMax || 5;
  const tokenCost = blendedTokenCostPer1M(c.s, c.tokenScale);
  let tpa = c.inp.p('tokensPerArt'); if (isNaN(tpa)) tpa = 50000;
  const hourly = targetBlendedTJM(c.s, c.rateScale) / 8;
  const cGenUnit = (tpa / 1e6) * tokenCost, cFb = lce.fallbackCost || 0;
  const loops = LOOP_PAIRS.map((lp, idx) => {
    const L = state[idx];
    const p = L ? L.pAccept : 1;
    const EN = lceExpectedIter(p, nMax), qN = lceEscapeRate(p, nMax);
    const cRev = (L && L.tRev ? L.tRev : 0) * hourly;
    const cAcc = EN * (cGenUnit + cRev) + qN * cFb;
    return { id: lp.id, label: lp.label, p, EN, escapePct: qN * 100, cGen: cGenUnit, cRev, cFb, cAcc,
      kEff: cGenUnit > 0 ? cAcc / cGenUnit : EN, reviewShare: cAcc > 0 ? (EN * cRev) / cAcc : 0 };
  });
  const n = loops.length || 1, mean = (k: 'EN' | 'escapePct' | 'reviewShare') => loops.reduce((t, l) => t + l[k], 0) / n;
  return { loops, nMax, calibrated, weightedEN: mean('EN'), escapePct: mean('escapePct'), reviewShare: mean('reviewShare') };
}
