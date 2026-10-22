import { describe, expect, it } from 'vitest';
import { consolidate, envelopeCase, portfolioHeadline, runStats, type Portfolio } from '@/domain/portfolio';
import { loadCase, scaledTeam, withProduct, withWave } from '../../helpers/portfolio';

/** 20 distinct products (own team each) over 60 months in 4 waves. */
function big(): Portfolio {
  const c = loadCase('horizon-5');
  let pf = envelopeCase(c);
  for (const [i, s] of [[2, 6], [3, 12], [4, 18]] as const) pf = withWave(pf, 'w' + i, s);
  pf = { ...pf, products: [{ ...pf.products[0]!, teamIn: scaledTeam(c, 0.5) }] };
  for (let i = 2; i <= 20; i++) pf = withProduct(pf, { id: 'p' + i, waveId: 'w' + (1 + (i % 4)), offset: i % 3, teamIn: scaledTeam(c, 0.5 + i / 10) });
  return { ...pf, waves: pf.waves.map((w) => ({ ...w, productIds: pf.products.filter((p) => p.waveId === w.id).map((p) => p.id) })) };
}
const best = (n: number, f: () => void): number => {
  let m = Infinity;
  for (let i = 0; i < n; i++) { const t = performance.now(); f(); m = Math.min(m, performance.now() - t); }
  return m;
};

describe('multi-product budgets (spec 8): best of several runs, so a loaded machine does not fail the test', () => {
  const pf = big();
  it('horizon is 60 months and the portfolio has 20 planned products', () => {
    const cons = consolidate(pf);
    expect([cons.horizon, cons.products.length]).toEqual([60, 20]);
    expect(portfolioHeadline(cons).net).toBeGreaterThan(0);
  });

  it('consolidating 20 products x 60 months takes < 30 ms (product runs warm)', () => {
    consolidate(pf);
    let k = 0;
    const ms = best(8, () => { k++; consolidate({ ...pf, waves: pf.waves.map((w) => ({ ...w, startMonth: w.startMonth + (k % 2) })), horizonMonths: 60 + k }); });
    expect(ms).toBeLessThan(30);
  });

  it('one product edit refreshes the portfolio in < 150 ms and builds exactly one engine', () => {
    consolidate(pf);
    const c = loadCase('horizon-5'), builds = runStats.builds;
    let f = 3, last: Portfolio = pf;
    const ms = best(3, () => {
      f += 0.37;
      last = { ...pf, products: pf.products.map((p) => (p.id === 'p7' ? { ...p, teamIn: scaledTeam(c, f) } : p)) };
      portfolioHeadline(consolidate(last));
    });
    expect(runStats.builds - builds).toBe(3);
    expect(ms).toBeLessThan(150);
  });

  it('editing a product does not rebuild the engines of the others', () => {
    const before = consolidate(pf), builds = runStats.builds;
    const next = { ...pf, products: pf.products.map((p) => (p.id === 'p3' ? { ...p, name: 'renamed', knowledge: { targetCC: 2 } } : p)) };
    const after = consolidate(next);
    expect(runStats.builds - builds).toBe(1);
    after.products.filter((v) => v.id !== 'p3').forEach((v) => expect(v.run).toBe(before.products.find((x) => x.id === v.id)!.run));
    const rename = consolidate({ ...pf, products: pf.products.map((p) => (p.id === 'p4' ? { ...p, name: 'x', note: 'y' } : p)) });
    expect(runStats.builds - builds).toBe(1);
    expect(rename.summary.net).toBe(before.summary.net);
  });
});
