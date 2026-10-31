import { describe, expect, it } from 'vitest';
import { consolidate, portfolioHeadline, runStats, withProductRows, type Portfolio } from '@/domain/portfolio';
import { bestOf, bigPortfolio, loadCase, scaledTeam } from '../../helpers/portfolio';

const big = bigPortfolio, best = bestOf;

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
    const ms = best(8, () => {
      k++;
      consolidate({ ...pf, waves: pf.waves.map((w) => ({ ...w, startMonth: w.startMonth + (k % 2) })), horizonMonths: 60 + k });
    });
    expect(ms).toBeLessThan(30);
  });

  it('one product edit refreshes the portfolio in < 150 ms and builds exactly one engine', () => {
    consolidate(pf);
    const c = loadCase('horizon-5'), builds = runStats.builds;
    let f = 3, last: Portfolio = pf;
    const ms = best(3, () => {
      f += 0.37;
      last = withProductRows(pf, 'p7', scaledTeam(c, f));   // schema v5: the team is in the common document; the others keep their case
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
