import { mcDraws, mcParamsOf, mcPearson, mcStats } from '../stress';
import { pfStressFingerprint } from './stressFingerprint';
import { clampRho, commonShock, productSeed } from './stressSeed';
import type { Diversification, PfStress, PfStressJob, PfStressOpts, ProductStress, StressStats, WaveStress } from './stressTypes';
import { runOf } from './run';
import { resolveProduct } from './resolve';
import { scheduledProducts } from './timeline';
import type { Portfolio } from './types';

/** (P90 - P10) / |P50|, null when the median is 0: the relative width, comparable between a product and the portfolio. */
export const relSpreadOf = (s: { p10: number; p50: number; p90: number }): number | null => (s.p50 === 0 ? null : (s.p90 - s.p10) / Math.abs(s.p50));

/** The shared definition of the stats (single-case `mcStats`) plus the relative spread; `sorted` is the ascending copy. */
function statsOf(outcomes: number[], seed: number): { sorted: number[]; stats: StressStats } {
  const { sorted, stats } = mcStats(outcomes, seed);
  return { sorted, stats: { ...stats, relSpread: relSpreadOf(stats) } };
}

const sum = (cols: number[][], n: number): number[] => {
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
 * same shocks. The portfolio outcome of a draw is the sum of the products' net benefits of that draw (shifting a product on the calendar
 * does not change an undiscounted sum; products are not cut at the portfolio horizon, see DEVIATIONS).
 */
export function pfStressJob(pf: Portfolio, o: PfStressOpts): PfStressJob {
  const n = Math.max(1, Math.floor(o.draws)), rho = clampRho(o.rho), plan = scheduledProducts(pf);
  const runs = plan.map((s) => runOf(resolveProduct(pf, s.product.id)));
  const drivers = Math.max(0, ...runs.map((r) => mcParamsOf(r.ctx.s).length)), shock = commonShock(o.seed, rho, n, drivers);
  const draws: number[][] = [];
  return {
    steps: plan.length,
    step(i) { const ctx = (runs[i] as (typeof runs)[number]).ctx; draws[i] = mcDraws(ctx, n, productSeed(o.seed, (plan[i] as (typeof plan)[number]).product.id, plan.length), mcParamsOf(ctx.s), shock ?? undefined).outcomes; },
    finish() {
      const unsorted = sum(draws, n), total = statsOf(unsorted, o.seed);
      const per = plan.map((s, i) => ({ s, d: draws[i] as number[], st: statsOf(draws[i] as number[], o.seed).stats }));
      const products: ProductStress[] = per.map(({ s, d, st }) => ({ id: s.product.id, name: s.product.name, waveId: s.wave.id, month0: s.month0, stats: st, r: +mcPearson(d, unsorted).toFixed(3) }));
      const waves: WaveStress[] = pf.waves.flatMap((w) => {
        const mine = per.filter((x) => x.s.wave.id === w.id);
        return mine.length ? [{ id: w.id, name: w.name, productIds: mine.map((x) => x.s.product.id), stats: statsOf(sum(mine.map((x) => x.d), n), o.seed).stats }] : [];
      });
      const sumP10 = products.reduce((a, p) => a + p.stats.p10, 0), diversification: Diversification = { sumP10, p10: total.stats.p10, reduction: total.stats.p10 - sumP10 };
      return { draws: n, seed: o.seed, rho, outcomes: total.sorted, stats: total.stats, products, waves, diversification, fingerprint: pfStressFingerprint(pf, rho) };
    },
  };
}

/** The whole run at once (deterministic: the same portfolio, draws, seed and rho give the same result). */
export function portfolioMonteCarlo(pf: Portfolio, o: PfStressOpts): PfStress {
  const job = pfStressJob(pf, o);
  for (let i = 0; i < job.steps; i++) job.step(i);
  return job.finish();
}
