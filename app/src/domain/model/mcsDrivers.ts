import { SUP_REF_HOURS_PER_PERIOD } from '../catalog';
import type { Ctx } from '../ctx';
import { targetBlendedTJM } from '../location';
import { blendedTokenCostPer1M } from '../tokens';
import { lceModel } from './lce';
import { mcsOf, type McsDriverOverride } from './modelState';
import { betaFromMeanCI, betaInv, normalCdf, stdNormal, triInv } from './numerics';

/** Seed distributions of the 7 drivers of the stochastic layer (AME-SPEC P4); overridable per id via MODEL.MCS.dists. */
export const MCS_DRIVER_SEED: Record<string, McsDriverOverride> = {
  p: { kind: 'beta', group: 'organisational', label: 'Acceptance rate (P1)', fallbackMean: 0.85, fallbackLo: 0.7, fallbackHi: 0.95 },
  y1Ramp: { kind: 'tri', group: 'organisational', label: 'Year-1 ramp', spreadPct: 15 },
  y2Ramp: { kind: 'tri', group: 'organisational', label: 'Year-2 ramp', spreadPct: 15 },
  y3Ramp: { kind: 'tri', group: 'organisational', label: 'Year-3 ramp', spreadPct: 15 },
  dayRate: { kind: 'tri', group: 'organisational', label: 'Loaded day rate (blended)', spreadPct: 10 },
  supCapacity: { kind: 'tri', group: 'organisational', label: 'Supervising capacity (P3)', spreadPct: 20 },
  tokenPrice: { kind: 'lognormal', group: 'exogenous', label: 'Token unit price', sigma: 0.25 },
};
export const MCS_DRIVER_ORDER = ['p', 'y1Ramp', 'y2Ramp', 'y3Ramp', 'dayRate', 'supCapacity', 'tokenPrice'];
export type McsSample = Record<string, number>;

export const mcsSpec = (c: Ctx, id: string): McsDriverOverride => ({ ...MCS_DRIVER_SEED[id], ...(mcsOf(c.s.MODEL).dists[id] ?? {}) });

/** Base value of a driver read from the CURRENT case ("perturb around today's value"). */
export function mcsBaseValue(c: Ctx, id: string): number {
  if (id === 'p') {
    if (c.s.MODEL.FLAGS.lce) {
      const lm = lceModel(c);
      if (lm.loops.length) return lm.loops.reduce((t, l) => t + l.p, 0) / lm.loops.length;
    }
    return mcsSpec(c, 'p').fallbackMean as number;
  }
  if (id === 'y1Ramp' || id === 'y2Ramp' || id === 'y3Ramp') { const v = parseFloat(c.inp.v(id)); return isNaN(v) ? 0 : v; }
  if (id === 'dayRate') return targetBlendedTJM(c.s, c.rateScale);
  if (id === 'supCapacity') return c.s.MODEL.SUP.hoursPerPeriod > 0 ? c.s.MODEL.SUP.hoursPerPeriod : SUP_REF_HOURS_PER_PERIOD;
  if (id === 'tokenPrice') return blendedTokenCostPer1M(c.s, c.tokenScale);
  return 0;
}

/** The ±8 pt acceptance band around the base p. */
const pBand = (base: number) => { const mean = Math.min(0.999, Math.max(0.05, base)); return { mean, lo: Math.max(0.05, mean - 0.08), hi: Math.min(0.999, mean + 0.08) }; };

/** One correlated draw across the seven drivers (one-factor Gaussian copula; the exogenous token price ignores the common factor). */
export function mcsDrawOne(c: Ctx, rng: () => number, bases: McsSample, rho: number): McsSample {
  const z = stdNormal(rng), out: McsSample = {};
  for (const id of MCS_DRIVER_ORDER) {
    const spec = mcsSpec(c, id), base = bases[id] as number, eps = stdNormal(rng);
    const corr = spec.group === 'organisational' ? rho * z + Math.sqrt(Math.max(0, 1 - rho * rho)) * eps : eps;
    if (spec.kind === 'beta') {
      const b = id === 'p' ? pBand(base) : { mean: base, lo: spec.fallbackLo as number, hi: spec.fallbackHi as number };
      const ab = betaFromMeanCI(b.mean, b.lo, b.hi);
      out[id] = betaInv(normalCdf(corr), ab.a, ab.b);
    } else if (spec.kind === 'tri') {
      const half = (base * (spec.spreadPct || 10)) / 100;
      out[id] = triInv(normalCdf(corr), base - half, base, base + half);
    } else if (spec.kind === 'lognormal') {
      const sigma = spec.sigma || 0.25;
      out[id] = base * Math.exp(sigma * corr - 0.5 * sigma * sigma);
    } else out[id] = base;
  }
  return out;
}

/** P10 / P90 of one driver's marginal distribution (tornado). */
export function mcsMarginalBand(c: Ctx, id: string, base: number): [number, number] {
  const spec = mcsSpec(c, id);
  if (spec.kind === 'beta') {
    const b = id === 'p' ? pBand(base) : { mean: base, lo: spec.fallbackLo as number, hi: spec.fallbackHi as number };
    const ab = betaFromMeanCI(b.mean, b.lo, b.hi);
    return [betaInv(0.1, ab.a, ab.b), betaInv(0.9, ab.a, ab.b)];
  }
  if (spec.kind === 'tri') {
    const half = (base * (spec.spreadPct || 10)) / 100;
    return [triInv(0.1, base - half, base, base + half), triInv(0.9, base - half, base, base + half)];
  }
  const sigma = spec.sigma || 0.25;
  return [base * Math.exp(-1.2816 * sigma), base * Math.exp(1.2816 * sigma)];
}
