import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { envelopeCase, pfDecision, portfolioMonteCarlo, runOf, resolveProduct, type PfStress } from '@/domain/portfolio';
import { mcSeedOf, runMonteCarlo } from '@/domain/stress';
import { DI_THRESHOLDS, decide } from '@/domain/verdict';
import { identical, loadCase, withProduct, withWave } from '../../helpers/portfolio';

const base = loadCase('horizon-5');
const pf2 = withProduct(withWave(identical(base, 1), 'w2', 6), { id: 'p2', waveId: 'w2' });
const real = portfolioMonteCarlo(pf2, { draws: 200, seed: 42, rho: 0 });
const forced = (stats: Partial<PfStress['stats']>): PfStress => ({ ...real, stats: { ...real.stats, ...stats } });
const verdictOf = (stats: Partial<PfStress['stats']>) => pfDecision(pf2, forced(stats), { kind: 'portfolio' })!.verdict;

describe('portfolio verdict = the single-case rule on the portfolio outcome', () => {
  it('a lone product gets exactly decide()', () => {
    for (const id of ['horizon-5', 'ctx-msi', 'di-risk-on']) {
      const c = loadCase(id), ctx = makeCtx(c), seed = mcSeedOf(ctx), pf = envelopeCase(c);
      const legacy = decide(ctx, runMonteCarlo(ctx, 200, seed)), d = pfDecision(pf, portfolioMonteCarlo(pf, { draws: 200, seed, rho: 0 }), { kind: 'portfolio' })!;
      expect([d.verdict, d.confidence, d.p10Floor, d.premium, d.setup]).toEqual([legacy.verdict, legacy.confidence, legacy.p10Floor, legacy.premium, legacy.setup]);
    }
  });
  const floor = pfDecision(pf2, real, { kind: 'portfolio' })!.p10Floor;
  it.each([
    ['strong: 95% positive, P10 above the floor', { pNetNeg: 0.05, p10: floor + 1 }, 'strong'],
    ['P10 under the floor blocks strong', { pNetNeg: 0.05, p10: floor - 1 }, 'conditional'],
    ['strong bar is 80 %: 21 % negative is conditional', { pNetNeg: 0.21, p10: floor + 1 }, 'conditional'],
    ['conditional down to 60 %', { pNetNeg: 0.4, p10: floor + 1 }, 'conditional'],
    ['below 60 %: defer', { pNetNeg: 0.45, p10: floor + 1 }, 'defer'],
  ] as const)('%s', (_n, stats, expected) => {
    // the engagement premium of the fixture raises the bars; compare to the same rule on the same premium
    const d = pfDecision(pf2, forced(stats), { kind: 'portfolio' })!;
    const sBar = Math.min(0.95, DI_THRESHOLDS.strongPPos + d.premium), cBar = Math.min(0.9, DI_THRESHOLDS.condPPos + d.premium), pPos = 1 - stats.pNetNeg;
    const want = pPos >= sBar && stats.p10 > floor ? 'strong' : pPos >= cBar ? 'conditional' : 'defer';
    expect(d.verdict).toBe(want);
    if (d.premium === 0) expect(d.verdict).toBe(expected);
  });
  it('coherence invariant: never strong above 20 % P(net<0), whatever the bars', () => {
    expect(verdictOf({ pNetNeg: 0.25, p10: floor + 1 })).not.toBe('strong');
  });
  it('setup is the sum of the products, the premium is weighted by entry headcount', () => {
    const d = pfDecision(pf2, real, { kind: 'portfolio' })!, one = pfDecision(envelopeCase(base), portfolioMonteCarlo(envelopeCase(base), { draws: 100, seed: 42, rho: 0 }), { kind: 'portfolio' })!;
    expect(d.setup).toBeCloseTo(2 * one.setup, 6);
    expect(d.premium).toBeCloseTo(one.premium, 9);
    expect(d.ctx.map((x) => x.k)).toEqual(expect.arrayContaining(['Scope', 'Correlation between products (rho)', 'Risk bar premium']));
    expect(runOf(resolveProduct(pf2, 'p2')).baseEtp).toBeGreaterThan(0);
  });
  it('a wave has its own verdict from its own distribution; an unknown wave has none', () => {
    const w = pfDecision(pf2, real, { kind: 'wave', id: 'w2' })!;
    expect(w.stats).toEqual(real.waves[1]!.stats);
    expect(w.ctx[0]!.v).toContain('w2');
    expect(pfDecision(pf2, real, { kind: 'wave', id: 'nope' })).toBeNull();
  });
  it('the conditions name the products that carry the risk', () => {
    const d = pfDecision(pf2, portfolioMonteCarlo(pf2, { draws: 200, seed: 42, rho: 1 }), { kind: 'portfolio' })!;
    expect(d.conditions.length).toBeGreaterThan(0);
    expect(d.conditions[0]).toMatch(/Produit 1|p2/);
  });
});
