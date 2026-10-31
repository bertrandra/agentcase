import { describe, expect, it } from 'vitest';
import { buildCalcPackage } from '@/domain/calcPackage';
import { paybackMonthOf } from '@/domain/economics/cashflow';
import { costReduction } from '@/domain/economics/costReduction';
import { flowModel } from '@/domain/model/flow';
import {
  buildPortfolioPackages, consolidate, consolidationView, envelopeCase, flowByProduct, portfolioHeadline, portfolioMonteCarlo, productCtx,
  sensitivityByProduct, type Portfolio,
} from '@/domain/portfolio';
import { MC_PARAMS_DEFAULT, sensitivityMatrix } from '@/domain/stress';
import type { CaseState } from '@/domain';
import { noProgramme } from '../../helpers/legacyProgramme';
import { expectClose, loadCase, scaledTeam, withProduct, withWave } from '../../helpers/portfolio';

const still = (pf: Portfolio): Portfolio =>
  ({ ...pf, common: { ...pf.common, mcParams: MC_PARAMS_DEFAULT.map((p) => ({ ...p, spread: 0 })) } as Portfolio['common'] });
const legacyCurve = (c: CaseState): CaseState => ({ ...c, scurve: { ...c.scurve, curve: 'legacy.flatAnnual' } } as CaseState);
/** horizon-5 (60 months) as p1 at month 0, plus p2 of `teamF` x the team starting at `start`, with an optional extra setup. */
function two(base: CaseState, horizonMonths: number, start: number, setupTooling?: string, teamF = 0.6): Portfolio {
  const pf = withWave({ ...envelopeCase(base), horizonMonths }, 'w2', start);
  return withProduct(pf, { id: 'p2', waveId: 'w2', teamIn: scaledTeam(base, teamF), overrides: setupTooling ? { dom: { values: { setupTooling } } } : {} });
}

describe('DEV-LEGACY-CURVE-HORIZON: the portfolio Monte Carlo of a legacy-curve case', () => {
  it('zero variance: P50 of every draw = the consolidated net (products and total), horizon 5 years', () => {
    const pf = still(two(legacyCurve(loadCase('horizon-5')), 60, 0)), r = portfolioMonteCarlo(pf, { draws: 60, seed: 42, rho: 0 }), c = consolidate(pf);
    expectClose(r.stats.p50, c.summary.net, 1e-9);
    r.products.forEach((p, i) => expectClose(p.stats.p50, c.products[i]!.summary.net, 1e-9));
  });
});

describe('sensitivity by product: the negative cells of the rerun matrix', () => {
  // B9b: the products carry no programme resources (noProgramme), so "cheap" is a setup of tooling only, as before DEV-B9B-COACHING / -RESOURCES
  it('a product with a heavy setup has negative cells, counted; the cheap one has none', () => {
    const pf = two(noProgramme(loadCase('golden')), 36, 0, '6000000'), rows = sensitivityByProduct(pf, ['p1', 'p2']);
    const neg = (id: string) => sensitivityMatrix(productCtx(pf, id)).cells.flat().filter((x) => x.roi !== null && x.roi < 0).length;
    expect(rows.map((r) => r.negative)).toEqual([neg('p1'), neg('p2')]);
    expect(rows[0]!.negative).toBe(0);
    expect(rows[1]!.negative).toBeGreaterThan(0);
    expect(rows[1]!.roiLow!).toBeLessThan(0);
  });
});

describe('DEV-PAYBACK-RECOVERY: a late, costly wave', () => {
  const cumOf = (pf: Portfolio) => consolidate(pf).summary.cum;
  it('pays back after the last negative cumulative month, not at the first crossing', () => {
    const pf = two(noProgramme(loadCase('horizon-5')), 60, 30, '2500000', 0.4), cum = cumOf(pf), first = cum.findIndex((x) => x >= 0) + 1;
    const lastNeg = cum.reduce((k, x, i) => (x < 0 ? i + 1 : k), 0);
    expect(lastNeg).toBeGreaterThan(first);   // the cumulative dips below 0 again when the second wave's setup lands
    expect(cum.at(-1)!).toBeGreaterThanOrEqual(0);
    expect(consolidate(pf).summary.paybackMonth).toBe(lastNeg + 1);
    expect(portfolioHeadline(consolidate(pf)).paybackYear).toBe(Math.ceil((lastNeg + 1) / 12));
  });
  it('null when the final cumulative is negative', () => {
    const pf = two(noProgramme(loadCase('horizon-5')), 60, 30, '40000000', 0.4);
    expect(cumOf(pf).at(-1)!).toBeLessThan(0);
    expect(consolidate(pf).summary.paybackMonth).toBeNull();
    expect(paybackMonthOf(cumOf(pf))).toBeNull();
  });
});

describe('a product shorter than the portfolio horizon: stocks held, flows stop', () => {
  // golden (36 months) inside a 60-month portfolio
  const pf = { ...envelopeCase(loadCase('golden')), horizonMonths: 60 }, c = consolidate(pf), v = c.products[0]!, rows = v.run.rows, last = rows[35]!;
  it('human FTE (run team included), vFTE and adoption keep their month-36 value; savings, run, setup stay 0', () => {
    for (let i = 36; i < 60; i++) {
      expectClose(v.series.humanFte[i]!, last.humanFte + last.runTeamFte); expectClose(v.series.agentVfte[i]!, last.agentVfte);
      expectClose(c.adoptionPct[i]!, last.adoptionRampPct);
      expect([v.series.savings[i], v.series.run[i], v.series.setup[i], v.series.net[i]]).toEqual([0, 0, 0, 0]);
    }
  });
  it('fte.after is the series end = the product\'s own fte.after; the views read the same end values', () => {
    const h = portfolioHeadline(c), own = v.run.engine.years().at(-1)!.totalHumanFteEnd, view = consolidationView(pf, c);
    expectClose(h.fte.after, own);
    expectClose(view.totals.etp, own); expectClose(view.totals.vfte, last.agentVfte);
  });
  it('cost reduction on the calendar basis: the product\'s own months, = its single-case costReduction', () => {
    const cr = portfolioHeadline(c).costReduction, own = costReduction(v.run.ctx);
    expectClose(cr.base, own.base); expectClose(cr.net, own.net); expectClose(cr.gross, own.gross);
    expect(cr.years).toBe(5);
  });
  it('cut by a shorter portfolio horizon: the baseline counts the kept months only', () => {
    const cut = consolidate({ ...envelopeCase(loadCase('golden')), horizonMonths: 24 }), cr = portfolioHeadline(cut).costReduction;
    expectClose(cr.base, costReduction(v.run.ctx).base * (24 / 36)); expect(cr.years).toBe(2);
  });
});

describe('saved packages: totalSavings is net at both levels', () => {
  it('portfolio package totalSavings = consolidated net; = the product package for a one-product portfolio', () => {
    const pf = envelopeCase(loadCase('golden')), p = buildPortfolioPackages(pf), h = portfolioHeadline(consolidate(pf));
    expectClose(p.calculationPackage.headline.totalSavings, h.net);
    expectClose(p.calculationPackage.headline.totalSavings, buildCalcPackage(loadCase('golden')).headline.totalSavings);
    p.calculationPackage.annual.forEach((y, i) => expectClose(y.cumulativeCashFlowEnd, h.cum[Math.min(h.cum.length, (i + 1) * 12) - 1]!));
  });
  it('an empty product list does not crash', () => {
    const pf = { ...envelopeCase(loadCase('golden')), products: [], waves: [{ id: 'w1', name: 'Wave 1', startMonth: 0, productIds: [] }] };
    const p = buildPortfolioPackages(pf);
    expect(p.calculationPackages).toEqual({});
    expect(p.calculationPackage.headline.totalSavings).toBe(0);
    expect(p.calculationPackage.calculationVersion).toBe(buildCalcPackage(loadCase('golden')).calculationVersion);
  });
});

describe('time-to-market value on the calendar', () => {
  const base = loadCase('me-flow');
  it('a product inside the horizon at month 0 keeps its own value; started later it is discounted from calendar month 1 and cut', () => {
    const one = envelopeCase(base);
    expectClose(flowByProduct(one, ['p1']).rows[0]!.flowNpv!, flowModel(productCtx(one, 'p1')).flowNpv);
    const late = two(base, 60, 24, undefined, 1), r = flowByProduct(late, ['p1', 'p2']), own = flowModel(productCtx(late, 'p2')).flowNpv;
    expect(r.rows[1]!.flowNpv!).toBeLessThan(own * 0.6);   // 36 of its 60 months kept, two years later
    expectClose(r.flowNpv, r.rows[0]!.flowNpv! + r.rows[1]!.flowNpv!);
  });
});
