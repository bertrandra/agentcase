/** @calc-zone stress */
import { mcDraws, mcParamsOf, mcPearson, mcStats } from '../stress';
import { pfStressFingerprint } from './stressFingerprint';
import { cutOutcome } from './stressCut';
import { clampRho, commonShock, productSeed } from './stressSeed';
import type { Diversification, PfStress, PfStressJob, PfStressOpts, ProductStress, StressStats, WaveStress } from './stressTypes';
import { runOf } from './run';
import { resolveProduct } from './resolve';
import { scheduledProducts } from './timeline';
import type { Portfolio } from './types';

/** Correlation of a product's draws with a group's draws, rounded to 3 decimals (as every table shows it). */
export const corr3 = (d: number[], ref: number[]): number => +mcPearson(d, ref).toFixed(3);

/** (P90 - P10) / |P50|, null when the median is 0: the relative width, comparable between a product and the portfolio. */
export const relSpreadOf = (s: { p10: number; p50: number; p90: number }): number | null => (s.p50 === 0 ? null : (s.p90 - s.p10) / Math.abs(s.p50));

/** The shared definition of the stats (single-case `mcStats`) plus the relative spread; `sorted` is the ascending copy. */
export function statsOf(outcomes: number[], seed: number): { sorted: number[]; stats: StressStats } {
  const { sorted, stats } = mcStats(outcomes, seed);
  return { sorted, stats: { ...stats, relSpread: relSpreadOf(stats) } };
}

/** Draw-by-draw sum of the products' draws, in the order given (the one sum behind the portfolio, a wave and a unit). */
export const sumDraws = (cols: number[][], n: number): number[] => {
  const out = new Array<number>(n).fill(0);
  for (const c of cols) for (let i = 0; i < n; i++) out[i]! += c[i]!;
  return out;
};

/**
 * The portfolio Monte Carlo as a job of one step per planned product (so a caller can yield to the screen between two products).
 *
 * Construction (spec 6.4, D-M7). Per product, the single-case engine draws (`mcDraws`: the same drivers, spreads, clamps and net-benefit
 * metric `mcOutcome` as the product's own Monte Carlo) from a stream seeded by `productSeed` (seed XOR hash(id); the seed itself for a lone
 * product). With rho > 0 each driver's triangular shock is read from g = sqrt(rho) Z + sqrt(1 - rho) eps (Z shared by all products, eps the
 * product's own), through Phi and the inverse of the same marginal: every product keeps its own marginal law, rho = 1 gives the products the
 * same shocks. The portfolio outcome of a draw is the sum of the products' net benefits of that draw, each placed on the calendar (wave
 * start + offset) and cut at the portfolio horizon exactly as the deterministic consolidation does (`cutOutcome`; a product inside the
 * horizon keeps `mcOutcome`, the same undiscounted sum). A wave's outcome is the same sum over its products.
 */
export function pfStressJob(pf: Portfolio, o: PfStressOpts): PfStressJob {
  const n = Math.max(1, Math.floor(o.draws)), rho = clampRho(o.rho), plan = scheduledProducts(pf), L = Math.max(0, Math.floor(pf.horizonMonths) || 0);
  const runs = plan.map((s) => runOf(resolveProduct(pf, s.product.id)));
  const drivers = Math.max(0, ...runs.map((r) => mcParamsOf(r.ctx.s).length)), shock = commonShock(o.seed, rho, n, drivers);
  const draws: number[][] = [];
  return {
    steps: plan.length,
    step(i) {
      const r = runs[i] as (typeof runs)[number], s = plan[i] as (typeof plan)[number];
      draws[i] = mcDraws(r.ctx, n, productSeed(o.seed, s.product.id, plan.length), mcParamsOf(r.ctx.s), shock ?? undefined,
        cutOutcome(s, r.rows.length, L)).outcomes;
    },
    finish() {
      const unsorted = sumDraws(draws, n), total = statsOf(unsorted, o.seed);
      const per = plan.map((s, i) => ({ s, d: draws[i] as number[], st: statsOf(draws[i] as number[], o.seed).stats }));
      const sums = new Map(pf.waves.map((w) => [w.id, sumDraws(per.filter((x) => x.s.wave.id === w.id).map((x) => x.d), n)] as const));
      const products: ProductStress[] = per.map(({ s, d, st }) => ({ id: s.product.id, name: s.product.name, waveId: s.wave.id, month0: s.month0, stats: st,
        r: corr3(d, unsorted), rWave: corr3(d, sums.get(s.wave.id) as number[]), perDraw: d }));
      const waves: WaveStress[] = pf.waves.flatMap((w) => {
        const mine = per.filter((x) => x.s.wave.id === w.id);
        if (!mine.length) return [];
        const st = statsOf(sums.get(w.id) as number[], o.seed);
        return [{ id: w.id, name: w.name, productIds: mine.map((x) => x.s.product.id), stats: st.stats, outcomes: st.sorted }];
      });
      const sumP10 = products.reduce((a, p) => a + p.stats.p10, 0),
        diversification: Diversification = { sumP10, p10: total.stats.p10, reduction: total.stats.p10 - sumP10 };
      return { draws: n, seed: o.seed, rho, outcomes: total.sorted, stats: total.stats, products, waves, diversification,
        fingerprint: pfStressFingerprint(pf, rho) };
    },
  };
}

/** The whole run at once (deterministic: the same portfolio, draws, seed and rho give the same result). */
export function portfolioMonteCarlo(pf: Portfolio, o: PfStressOpts): PfStress {
  const job = pfStressJob(pf, o);
  for (let i = 0; i < job.steps; i++) job.step(i);
  return job.finish();
}
