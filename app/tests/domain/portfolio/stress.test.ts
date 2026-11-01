import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { envelopeCase, pfStressFingerprint, portfolioMonteCarlo, productSeed, relSpreadOf, withProductRows, type Portfolio } from '@/domain/portfolio';
import { mcSeedOf, runMonteCarlo } from '@/domain/stress';
import { quantile } from '@/domain/model/numerics';
import { extraIds, loadCase as loadExtraCase } from '../../helpers/extras';
import { identical, loadCase, scaledTeam, withProduct, withWave } from '../../helpers/portfolio';

const N = 300;
const run = (pf: Portfolio, rho: number, seed = 42, draws = N) => portfolioMonteCarlo(pf, { draws, seed, rho });
const base = loadCase('horizon-5');

describe('portfolio Monte Carlo: one product is today\'s Monte Carlo', () => {
  it.each(extraIds('mcRun'))('%s: same draws, same stats (rho has no effect on a lone product)', (id) => {
    const c = loadExtraCase(id), ctx = makeCtx(c), seed = mcSeedOf(ctx), legacy = runMonteCarlo(ctx, 200, seed);
    for (const rho of [0, 0.7, 1]) {
      const r = run(envelopeCase(c), rho, seed, 200);
      if (rho === 0) {
        expect(r.outcomes).toEqual(legacy.outcomes);
        expect(r.stats).toMatchObject(legacy.stats);
        expect(r.diversification.reduction).toBe(0);
      } else {
        // a lone product under a common shock is still one product with its own marginals
        expect(Math.abs(r.stats.mean - legacy.stats.mean)).toBeLessThan(0.25 * Math.abs(legacy.stats.p90 - legacy.stats.p10) + 1);
      }
    }
  });
});

describe('correlation rho', () => {
  const pf = identical(base, 3);
  it('rho = 1: identical products have identical draws, the portfolio is 3 x the product', () => {
    const r = run(pf, 1), a = r.products[0]!.stats;
    r.products.forEach((p) => expect(p.stats).toEqual(a));
    expect(r.stats.p10).toBeCloseTo(3 * a.p10, 6);
    expect(r.stats.p90).toBeCloseTo(3 * a.p90, 6);
    expect(r.diversification.reduction).toBeCloseTo(0, 6);
    expect(r.products[0]!.r).toBeCloseTo(1, 2);
  });
  it('rho = 0: independent products (different draws, small mutual correlation, a real risk reduction)', () => {
    const r = run(pf, 0);
    expect(r.products[0]!.stats.p10).not.toBe(r.products[1]!.stats.p10);
    expect(r.products[0]!.r).toBeLessThan(0.75);
    expect(r.diversification.reduction).toBeGreaterThan(0);
  });
  it('relative spread: portfolio < standalone at rho = 0, equal at rho = 1', () => {
    const solo = relSpreadOf(run(identical(base, 1), 0).stats)!, indep = run(pf, 0).stats.relSpread!, common = run(pf, 1).stats.relSpread!;
    expect(indep).toBeLessThan(solo);
    expect(common).toBeCloseTo(run(pf, 1).products[0]!.stats.relSpread!, 6);
  });
  it('the risk reduction shrinks as rho grows', () => {
    const red = [0, 0.5, 1].map((rho) => run(pf, rho, 7, 400).diversification.reduction);
    expect(red[0]!).toBeGreaterThan(red[1]!);
    expect(red[1]!).toBeGreaterThan(red[2]! - 1e-6);
  });
  it('marginals do not depend on rho: each product keeps its standalone law (mean / median within sampling error)', () => {
    const seed = 11, n = 1500, ids = pf.products.map((p) => p.id);
    const sd = (r: ReturnType<typeof run>) => (r.stats.p90 - r.stats.p10) / 2.56;
    const ref = run(pf, 0, seed, n);
    for (const rho of [0.3, 0.8, 1]) {
      const r = run(pf, rho, seed, n);
      ids.forEach((_, i) => {
        const p = r.products[i]!.stats, q = ref.products[i]!.stats, s = (q.p90 - q.p10) / 2.56;
        expect(Math.abs(p.mean - q.mean)).toBeLessThan(0.2 * s);
        expect(Math.abs(p.p50 - q.p50)).toBeLessThan(0.25 * s);
        expect(Math.abs((p.p90 - p.p10) / 2.56 - s)).toBeLessThan(0.2 * s);
      });
      expect(sd(r)).toBeGreaterThan(sd(ref) * 0.95);
    }
  });
});

describe('determinism, structure, staleness', () => {
  const pf = withProduct(withWave(identical(base, 2), 'w2', 6), { id: 'p3', waveId: 'w2', offset: 2, teamIn: scaledTeam(base, 0.5) });
  it('same seed => identical results; another seed differs; per-product seeds are distinct and stable', () => {
    expect(run(pf, 0.4)).toEqual(run(pf, 0.4));
    expect(run(pf, 0.4, 43).outcomes).not.toEqual(run(pf, 0.4).outcomes);
    expect(productSeed(42, 'p1', 3)).not.toBe(productSeed(42, 'p2', 3));
    expect(productSeed(42, 'p1', 1)).toBe(42);
  });
  it('the portfolio draw is the sum of the products\' draws; waves are sums of their products; quantiles use the shared estimator', () => {
    const r = run(pf, 0.5);
    expect(r.outcomes).toHaveLength(N);
    expect(r.stats.p10).toBe(quantile(r.outcomes, 0.1));
    expect(r.stats.pNetNeg).toBe(r.outcomes.filter((v) => v < 0).length / N);
    expect(r.waves.map((w) => [w.id, w.productIds.length])).toEqual([['w1', 2], ['w2', 1]]);
    expect(r.waves[1]!.stats.p50).toBeCloseTo(r.products[2]!.stats.p50, 9);
    expect(r.stats.mean).toBeCloseTo(r.products.reduce((a, p) => a + p.stats.mean, 0), 6);
  });
  it('unplanned and archived products are not drawn', () => {
    const q = withProduct(pf, { id: 'p4', waveId: null });
    expect(run(q, 0).products.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
  it('fingerprint moves with a product, the wave start and rho, not with the view state', () => {
    const f = pfStressFingerprint(pf);
    expect(pfStressFingerprint({ ...pf })).toBe(f);
    expect(pfStressFingerprint({ ...pf, activeProductId: 'p2' })).toBe(f);
    expect(pfStressFingerprint(pf, 0.5)).not.toBe(f);
    expect(pfStressFingerprint({ ...pf, rho: 0.5 })).toBe(pfStressFingerprint(pf, 0.5));
    expect(pfStressFingerprint({ ...pf, waves: pf.waves.map((w) => ({ ...w, startMonth: w.startMonth + 1 })) })).not.toBe(f);
    expect(pfStressFingerprint(withProductRows(pf, pf.products[0]!.id, scaledTeam(base, 2)))).not.toBe(f);
    expect(run(pf, 0.2).fingerprint).toBe(pfStressFingerprint(pf, 0.2));
  });
});

describe('performance', () => {
  it('20 products x 1000 draws (a CPU-time budget; the job is chunked per product so the screen can breathe)', () => {
    let pf = envelopeCase(base);
    pf = withProductRows(pf, 'p1', scaledTeam(base, 0.5));
    for (let i = 2; i <= 20; i++) pf = withProduct(pf, { id: 'p' + i, teamIn: scaledTeam(base, 0.5 + i / 10) });
    // SPEC_FIXES FX-71: the budget is on this process's CPU time, not the wall clock — a loaded runner (the nightly runs the suite three times in
    // parallel) slows the wall clock, not the work; a slower implementation still fails. About 2 s of CPU on an idle machine.
    const t = performance.now(), cpu = process.cpuUsage(), r = portfolioMonteCarlo(pf, { draws: 1000, seed: 42, rho: 0.3 });
    const used = process.cpuUsage(cpu), cpuMs = (used.user + used.system) / 1000, ms = performance.now() - t;
    expect(r.products).toHaveLength(20);
    console.log(`20 x 1000 draws: ${Math.round(cpuMs)} ms CPU, ${Math.round(ms)} ms wall`);
    expect(cpuMs).toBeLessThan(5000);
  }, 60000);
});
