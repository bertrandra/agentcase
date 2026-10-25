import { describe, expect, it } from 'vitest';
import { consolidate, cutNet, cutOutcome, envelopeCase, portfolioMonteCarlo, runOf, resolveProduct, type Portfolio } from '@/domain/portfolio';
import { MC_PARAMS_DEFAULT, mcOutcome } from '@/domain/stress';
import { expectClose, identical, loadCase, scaledTeam, shiftWaves, withProduct, withWave } from '../../helpers/portfolio';

const base = loadCase('horizon-5');
const run = (pf: Portfolio, rho = 0, draws = 120, seed = 42) => portfolioMonteCarlo(pf, { draws, seed, rho });
/** The same portfolio with no uncertainty: every driver keeps its value, every draw is the deterministic case. */
const still = (pf: Portfolio): Portfolio => ({ ...pf, common: { ...pf.common, mcParams: MC_PARAMS_DEFAULT.map((p) => ({ ...p, spread: 0 })) } as Portfolio['common'] });
/** Two products over a 60-month calendar: p1 at month 0 (inside), p2 starting at month 48 (cut to 12 months). */
const late = (): Portfolio => withProduct(withWave({ ...envelopeCase(base), horizonMonths: 60 }, 'w2', 48), { id: 'p2', waveId: 'w2', teamIn: scaledTeam(base, 0.6) });

describe('per-draw horizon truncation: the draws are cut like the consolidation', () => {
  it('a product starting at month 48 on a 60-month horizon contributes its first 12 months only', () => {
    const pf = late(), p2 = runOf(resolveProduct(pf, 'p2')), twelve = p2.rows.slice(0, 12).reduce((a, r) => a + r.netSavings, 0);
    expect(p2.rows.length).toBe(60);
    expectClose(cutNet(p2.ctx, { month0: 48, lead: 0 }, 60), twelve);
    expectClose(consolidate(pf).products[1]!.summary.net, twelve);
    expect(cutOutcome({ month0: 48, lead: 0 }, 60, 60)).toBeTypeOf('function');
    expect(cutOutcome({ month0: 0, lead: 0 }, 60, 60)).toBeUndefined();
  });

  it('zero variance: every portfolio draw equals the deterministic consolidated net (products, waves and total)', () => {
    for (const pf of [still(late()), still(withProduct(withWave(identical(base, 2), 'w2', 30), { id: 'p3', waveId: 'w2', offset: 6 }))]) {
      const r = run(pf), c = consolidate(pf);
      expect(r.outcomes.length).toBe(120);
      for (const v of [r.outcomes[0]!, r.outcomes[119]!]) expectClose(v, c.summary.net, 1e-9);
      r.products.forEach((p, i) => { expectClose(p.stats.p10, c.products[i]!.summary.net, 1e-9); expectClose(p.stats.p90, c.products[i]!.summary.net, 1e-9); });
      for (const w of r.waves) expectClose(w.stats.mean, c.waves.find((x) => x.id === w.id)!.summary.net, 1e-9);
    }
  });

  it('a product cut by the horizon draws less than on its own horizon; one inside the horizon draws exactly today\'s metric', () => {
    const pf = late(), r = run(pf), wide = run({ ...pf, horizonMonths: 108 });
    expect(r.products[1]!.stats.mean).toBeLessThan(wide.products[1]!.stats.mean);
    expect(r.products[0]!.stats).toEqual(wide.products[0]!.stats);
    const z = run(still(pf)), p1 = runOf(resolveProduct(still(pf), 'p1'));
    expect(z.products[0]!.stats.p50).toBe(mcOutcome(p1.ctx));
  });

  it('a product entirely past the horizon contributes nothing; a KT preparation inside the horizon still counts', () => {
    const pf = { ...late(), horizonMonths: 48 };
    expect(run(still(pf)).products[1]!.stats.p50).toBe(0);
    const gold = shiftWaves(envelopeCase(loadCase('golden')), 6), g = gold.products[0]!;
    const kt = { ...gold, horizonMonths: 6, products: [{ ...g, knowledge: { ktLeadMonths: 3 } }] }, c = consolidate(kt);
    expect(c.summary.net).toBeLessThan(0);
    expectClose(run(still(kt)).stats.p50, c.summary.net, 1e-9);
  });

  it('the wave draws are its products added draw by draw (sorted); the portfolio draws are all of them', () => {
    const pf = withProduct(withWave(identical(base, 2), 'w2', 12), { id: 'p3', waveId: 'w2', offset: 2, teamIn: scaledTeam(base, 0.5) });
    const r = run(pf, 0.3);
    for (const w of r.waves) {
      expect(w.outcomes.length).toBe(120);
      expect(w.outcomes.every((v, i) => i === 0 || v >= w.outcomes[i - 1]!)).toBe(true);
      expect(w.stats.p50).toBeCloseTo((w.outcomes[59]! + w.outcomes[60]!) / 2, 6);
    }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expectClose(mean(r.outcomes), r.waves.reduce((a, w) => a + mean(w.outcomes), 0), 1e-9);
  });
});
