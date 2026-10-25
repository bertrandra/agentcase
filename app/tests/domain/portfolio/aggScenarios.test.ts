import { describe, expect, it } from 'vitest';
import {
  consolidate, envelopeCase, portfolioScenarios, productCtx, productSeries, scenarioRuns, summarize, type Portfolio, type ScenarioFigures,
} from '@/domain/portfolio';
import { paybackShown, scenarioSet } from '@/domain/stress';
import { expectClose, loadCase, withProduct, withWave } from '../../helpers/portfolio';
import { openPortfolioFixture } from '../../helpers/portfolioFixtures';

const SAMPLE = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med', 'horizon-5'];
const MONEY = ['setup', 'totBen', 'net', 'npv'] as const;
const ids = (pf: Portfolio) => pf.products.map((p) => p.id);

describe('one product: the portfolio scenarios are the product’s own scenarios', () => {
  it.each(SAMPLE)('%s', (id) => {
    const pf = envelopeCase(loadCase(id)), only = pf.products[0]!.id, got = portfolioScenarios(pf, [only]), set = scenarioSet(productCtx(pf, only));
    expect(got.rows.map((r) => [r.key, r.label])).toEqual(set.map((s) => [s.key, s.label]));
    set.forEach((s, i) => {
      const f = got.rows[i]!.figures;
      expectClose(f.setup, s.m.setup); expectClose(f.totBen, s.m.totBen); expectClose(f.net, s.m.net); expectClose(f.npv, s.m.npv);
      if (s.m.roi === null) expect(f.roi).toBeNull(); else expectClose(f.roi!, s.m.roi);
      expect(f.payback).toBe(paybackShown(s.m));
      expect(got.rows[i]!.products).toHaveLength(1);
    });
  });
});

describe('three products (pf-three-products): each portfolio row is the sum of the shifted product rows', () => {
  const pf = openPortfolioFixture('pf-three-products'), cons = consolidate(pf), all = ids(pf), got = portfolioScenarios(pf, all);
  it('every planned product is in every row, at its calendar month 0', () => {
    for (const r of got.rows) expect(r.products.map((p) => [p.id, p.month0])).toEqual(cons.products.map((v) => [v.id, v.month0]));
    expect(new Set(cons.products.map((v) => v.month0)).size).toBeGreaterThan(1);
  });
  it('setup, savings, net and NPV add up; the product row is its scenario engine laid on the calendar by the consolidation kernel', () => {
    for (const [k, r] of got.rows.entries()) {
      for (const m of MONEY) expectClose(r.figures[m], r.products.reduce((a, p) => a + p.figures[m], 0));
      for (const p of r.products) {
        const v = cons.products.find((x) => x.id === p.id)!, s = productSeries(scenarioRuns(v.run)[k]!.src, v, cons.horizon);
        const sm = summarize(s, s.first, cons.rate);
        expectClose(p.figures.net, sm.net); expectClose(p.figures.npv, sm.npv); expectClose(p.figures.setup, sm.setup);
      }
    }
  });
  it('“AI + Location” is the main case: its row is the deterministic consolidation (F16)', () => {
    const f = got.rows.find((r) => r.key === 'ailoc')!.figures, s = cons.summary;
    expectClose(f.net, s.net); expectClose(f.npv, s.npv); expectClose(f.setup, s.setup); expectClose(f.totBen, s.totalBenefit);
    expect(f.payback).toBe(s.paybackMonth);
  });
  it('a wave: its products only, and the main-case row is the wave aggregate', () => {
    const w = cons.waves.find((x) => x.productIds.length)!, g = portfolioScenarios(pf, w.productIds);
    expect(g.rows[0]!.products.map((p) => p.id)).toEqual(w.productIds);
    expectClose(g.rows.find((r) => r.key === 'ailoc')!.figures.npv, w.summary.npv);
  });
  it('memoised: the same selection gives the same object, and the scenario engines are kept per product run', () => {
    expect(portfolioScenarios(pf, all)).toBe(got);
    const v = cons.products[0]!;
    expect(scenarioRuns(v.run)).toBe(scenarioRuns(v.run));
  });
});

describe('shift and truncation follow the consolidation', () => {
  const c = loadCase('golden');
  const fig = (pf: Portfolio, key: string): ScenarioFigures => portfolioScenarios(pf, ids(pf)).rows.find((r) => r.key === key)!.figures;
  it('a product starting k months later: same net when the horizon grows by k, NPV discounted by k months, payback k months later', () => {
    const k = 5, base = envelopeCase(c), late: Portfolio = { ...base, waves: base.waves.map((w) => ({ ...w, startMonth: k })),
      horizonMonths: base.horizonMonths + k }, rate = consolidate(base).rate;
    for (const key of ['ai', 'ailoc', 'aidst']) {
      const a = fig(base, key), b = fig(late, key);
      expectClose(b.net, a.net); expectClose(b.npv, a.npv * Math.pow(1 + rate / 12, -k));
      expect(b.payback).toBe(a.payback === null || a.payback === 0 ? a.payback : a.payback + k);
    }
  });
  it('a product past the portfolio horizon contributes only its first months', () => {
    const pf = withProduct(withWave(envelopeCase(c), 'w2', 12), { id: 'late', waveId: 'w2' }), cons = consolidate(pf);
    const row = portfolioScenarios(pf, ids(pf)).rows.find((r) => r.key === 'ailoc')!, late = row.products.find((p) => p.id === 'late')!;
    expectClose(late.figures.net, cons.products.find((v) => v.id === 'late')!.summary.net);
    expect(late.figures.net).not.toBeCloseTo(row.products[0]!.figures.net, 0);
  });
  it('unknown or unplanned ids are left out; an empty selection gives six empty rows', () => {
    const pf = envelopeCase(c), e = portfolioScenarios(pf, ['gone']);
    expect(e.rows).toHaveLength(6);
    for (const r of e.rows) { expect(r.products).toEqual([]); expect(r.figures.net).toBe(0); }
  });
});
