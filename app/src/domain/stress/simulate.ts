import type { Ctx } from '../ctx';
import { activeCurve } from '../model/overlay';
import { modelRaw } from '../model/raw';
import { thinFor } from '../time/thin';
import { mcParamsOf, mcSpreadScale, type McParam } from './mcParams';
import { mcRng, mcSample } from './rng';
import { autoTechCap, withInputs } from './withInputs';

export interface McStats { p10: number; p50: number; p90: number; mean: number; pNeg: number; cvar10: number; n: number; seed: number }
export interface McSens { id: string; label: string; r: number }
export interface McResult { outcomes: number[]; stats: McStats; sens: McSens[]; n: number; seed: number }

/** Seed and draw count of the case (inputs mcSeed / mcDraws; 42 and 1000 when empty, draws clamped to 100..5000). */
export const mcSeedOf = (c: Ctx): number => Math.max(1, Math.round(c.inp.p('mcSeed')) || 42);
export const mcDrawsOf = (c: Ctx): number => Math.max(100, Math.min(5000, Math.round(c.inp.p('mcDraws')) || 1000));

/**
 * Horizon-aware net benefit of one evaluation: Σ annual savings − setup. Reads the model like the legacy `model()` overlay does
 * (yearly sums of the Time Engine) but through the thin aggregate; years beyond the model's own array are NaN, as in the legacy.
 */
export function mcOutcome(c: Ctx): number {
  const raw = modelRaw(c), curve = activeCurve(c);
  let sav = raw.yearSav;
  if (!curve.startsWith('legacy')) {
    try {
      const t = thinFor(c, { curveModelId: curve, model: raw });
      sav = raw.yearSav.map((_, i) => (t.years[Math.min(i, t.years.length - 1)] as { savings: number }).savings);
    } catch { /* overlay failed: the flat annual model stands, like the legacy */ }
  }
  let s = 0;
  for (let y = 0; y < raw.horizon; y++) s += sav[y] as number;
  return s - raw.setupTotal;
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length, mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = (xs[i] as number) - mx, b = (ys[i] as number) - my; num += a * b; dx += a * a; dy += b * b; }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}

/** Seeded Monte Carlo over the uncertain parameters (legacy runMonteCarlo): distribution, P10/P50/P90, CVaR and sensitivity. */
export function runMonteCarlo(c: Ctx, n: number, seed: number, params: McParam[] = mcParamsOf(c.s)): McResult {
  const rng = mcRng(seed), cap = autoTechCap(c);
  const base = params.map((p) => parseFloat(c.inp.v(p.id)) || 0), scale = params.map((p) => mcSpreadScale(c, p.id));
  const outcomes = new Array<number>(n), samples = params.map(() => new Array<number>(n));
  for (let i = 0; i < n; i++) {
    const ov: Record<string, string> = {};
    params.forEach((p, k) => {
      const v = mcSample(rng, base[k] as number, p, scale[k] as number, cap);
      (samples[k] as number[])[i] = v; ov[p.id] = String(v);
    });
    outcomes[i] = mcOutcome(withInputs(c, ov));
  }
  const sorted = outcomes.slice().sort((a, b) => a - b);
  const q = (f: number) => sorted[Math.min(n - 1, Math.max(0, Math.floor(f * n)))] as number;
  const k = Math.max(1, Math.floor(n * 0.1));
  const stats: McStats = { p10: q(0.1), p50: q(0.5), p90: q(0.9), mean: outcomes.reduce((s, v) => s + v, 0) / n,
    pNeg: outcomes.filter((v) => v < 0).length / n, cvar10: sorted.slice(0, k).reduce((s, v) => s + v, 0) / k, n, seed };
  const sens = params.map((p, j) => ({ id: p.id, label: p.label, r: +pearson(samples[j] as number[], outcomes).toFixed(3) }))
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return { outcomes: sorted, stats, sens, n, seed };
}
