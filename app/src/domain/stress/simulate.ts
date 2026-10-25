/** @calc-zone stress @owner mc-distribution */
import type { Ctx } from '../ctx';
import { normalCdf, quantile, stdNormal, triInv } from '../model/numerics';
import { activeCurve } from '../model/overlay';
import { modelRaw } from '../model/raw';
import { thinFor } from '../time/thin';
import { mcParamsOf, mcSpreadScale, type McParam } from './mcParams';
import { mcRng, mcSample, mcSampleT } from './rng';
import { autoTechCap, withInputs } from './withInputs';

/** `pNetNeg` = P(net benefit < 0) over the horizon (savings minus setup). */
export interface McStats { p10: number; p50: number; p90: number; mean: number; pNetNeg: number; cvar10: number; n: number; seed: number }
export interface McSens { id: string; label: string; r: number }
export interface McResult { outcomes: number[]; stats: McStats; sens: McSens[]; n: number; seed: number }

/** Seed and draw count of the case (inputs mcSeed / mcDraws; 42 and 1000 when empty, draws clamped to 100..5000). */
export const mcSeedOf = (c: Ctx): number => Math.max(1, Math.round(c.inp.p('mcSeed')) || 42);
export const mcDrawsOf = (c: Ctx): number => Math.max(100, Math.min(5000, Math.round(c.inp.p('mcDraws')) || 1000));

/**
 * Horizon-aware net benefit of one evaluation: the Time Engine's net cash-flow over the horizon (savings − setup, thin pass), on every curve, so it
 * equals `headline(c).net` of the same case. The legacy flat curves are engine adapters too (DEV-LEGACY-CURVE-HORIZON: the legacy summed the
 * three-entry annual model under them, so a 5-year case counted three years). The flat annual sum stands only if the engine fails.
 */
export function mcOutcome(c: Ctx): number {
  const raw = modelRaw(c);
  try { return thinFor(c, { curveModelId: activeCurve(c), model: raw }).totalSavings; } catch { /* overlay failed: the flat annual model stands */ }
  let s = 0;
  for (let y = 0; y < Math.min(raw.horizon, raw.yearSav.length); y++) s += raw.yearSav[y] as number;
  return s - raw.setupTotal;
}

export function pearson(xs: number[], ys: number[]): number {
  const n = xs.length, mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = (xs[i] as number) - mx, b = (ys[i] as number) - my; num += a * b; dx += a * a; dy += b * b; }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}

/** Common shocks of a portfolio run: `z(draw, param)` is the shared standard normal of that draw and driver, `rho` in (0, 1] the weight. */
export interface McShock { rho: number; z: (draw: number, param: number) => number }

/**
 * Stats of a set of outcomes (sorted copy, linear-interpolation quantiles, CVaR of the worst decile). The one definition behind both the
 * single-product run and the portfolio aggregate, so a pNeg or a P10 never means two things.
 */
export function mcStats(outcomes: number[], seed: number): { sorted: number[]; stats: McStats } {
  const n = outcomes.length, sorted = outcomes.slice().sort((a, b) => a - b), q = (f: number) => quantile(sorted, f), k = Math.max(1, Math.floor(n * 0.1));
  return { sorted, stats: { p10: q(0.1), p50: q(0.5), p90: q(0.9), mean: outcomes.reduce((s, v) => s + v, 0) / n,
    pNetNeg: outcomes.filter((v) => v < 0).length / n, cvar10: sorted.slice(0, k).reduce((s, v) => s + v, 0) / k, n, seed } };
}

/**
 * The draws of one case: per draw the sampled parameters and the net benefit they give. Without `shock` each driver is the legacy
 * triangular draw of the case's own stream. With a shock, driver = sqrt(rho) * Z + sqrt(1 - rho) * eps (eps from the case's own stream) is a
 * standard normal, mapped through Phi and the inverse of the same triangular marginal: the marginal law of every driver is unchanged.
 * `outcome` is the metric of a draw (`mcOutcome`; the portfolio passes the horizon-cut net of a product cut by the portfolio horizon).
 */
export function mcDraws(c: Ctx, n: number, seed: number, params: McParam[], shock?: McShock,
  outcome: (c: Ctx) => number = mcOutcome): { outcomes: number[]; samples: number[][] } {
  const rng = mcRng(seed), cap = autoTechCap(c);
  const base = params.map((p) => parseFloat(c.inp.v(p.id)) || 0), scale = params.map((p) => mcSpreadScale(c, p.id));
  const outcomes = new Array<number>(n), samples = params.map(() => new Array<number>(n));
  for (let i = 0; i < n; i++) {
    const ov: Record<string, string> = {};
    params.forEach((p, k) => {
      let v: number;
      if (shock) {
        const g = Math.sqrt(shock.rho) * shock.z(i, k) + Math.sqrt(1 - shock.rho) * stdNormal(rng);
        v = mcSampleT(triInv(normalCdf(g), -1, 0, 1), base[k] as number, p, scale[k] as number, cap);
      } else v = mcSample(rng, base[k] as number, p, scale[k] as number, cap);
      (samples[k] as number[])[i] = v; ov[p.id] = String(v);
    });
    outcomes[i] = outcome(withInputs(c, ov));
  }
  return { outcomes, samples };
}

/** Seeded Monte Carlo over the uncertain parameters (legacy runMonteCarlo): distribution, P10/P50/P90, CVaR and sensitivity. */
export function runMonteCarlo(c: Ctx, n: number, seed: number, params: McParam[] = mcParamsOf(c.s)): McResult {
  const { outcomes, samples } = mcDraws(c, n, seed, params), { sorted, stats } = mcStats(outcomes, seed);
  const sens = params.map((p, j) => ({ id: p.id, label: p.label, r: +pearson(samples[j] as number[], outcomes).toFixed(3) }))
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return { outcomes: sorted, stats, sens, n, seed };
}
