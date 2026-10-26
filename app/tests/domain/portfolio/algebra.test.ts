import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MEASURES, consolidate, envelopeCase, portfolioHeadline, validate } from '@/domain/portfolio';
import { expectClose, expectSeriesClose, FIXTURE_IDS, identical, loadCase, shiftWaves, withProduct, withWave } from '../../helpers/portfolio';

const SAMPLE = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med', 'horizon-5', 'curve-legacy'];

describe('A2: N identical products in one wave = N x one product', () => {
  it.each(SAMPLE)('%s', (id) => {
    const c = loadCase(id);
    fc.assert(fc.property(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 0, max: 8 }), (n, start) => {
      const one = consolidate(identical(c, 1, start)), many = consolidate(identical(c, n, start));
      for (const m of MEASURES) expectSeriesClose(many.series[m], one.series[m].map((x) => x * n));
      expectClose(many.summary.net, one.summary.net * n); expectClose(many.summary.npv, one.summary.npv * n);
      expectClose(many.summary.setup, one.summary.setup * n); expectClose(many.summary.totalBenefit, one.summary.totalBenefit * n);
      expect(many.summary.paybackMonth).toBe(one.summary.paybackMonth);
      expectClose(many.summary.roi ?? 0, one.summary.roi ?? 0);
      expectSeriesClose(many.adoptionPct, one.adoptionPct);
      expectClose(portfolioHeadline(many).velocityPct, portfolioHeadline(one).velocityPct);
    }), { numRuns: 15 });
  });
});

describe('A3: shifting waves by k months shifts the consolidation by k', () => {
  it.each(SAMPLE)('%s', (id) => {
    const c = loadCase(id);
    fc.assert(fc.property(fc.integer({ min: 1, max: 18 }), fc.integer({ min: 1, max: 9 }), (k, w2) => {
      const base = withProduct(withWave(envelopeCase(c), 'w2', w2), { id: 'p2', waveId: 'w2', offset: 1 });
      const a = consolidate(base), b = consolidate(shiftWaves(base, k));
      for (const m of MEASURES) {
        expectSeriesClose(b.series[m].slice(k), a.series[m]);
        expect(b.series[m].slice(0, k).every((x) => x === 0)).toBe(true);
      }
      expect(b.summary.paybackMonth).toBe(a.summary.paybackMonth === null ? null : a.summary.paybackMonth + k);
      expectClose(b.summary.npv, a.summary.npv * Math.pow(1 + a.rate / 12, -k));
      expectClose(b.summary.net, a.summary.net); expectClose(b.summary.roi ?? 0, a.summary.roi ?? 0);
    }), { numRuns: 12 });
  });
});

describe('A4: portfolio = sum of the products (every fixture, two products on two waves)', () => {
  it.each(FIXTURE_IDS)('%s', (id) => {
    const c = loadCase(id), pf = withProduct(withWave(envelopeCase(c), 'w2', 5), { id: 'p2', waveId: 'w2', offset: 2 });
    const cons = consolidate({ ...pf, horizonMonths: pf.horizonMonths + 7 });
    const sum = (f: (v: (typeof cons.products)[number]) => number) => cons.products.reduce((a, v) => a + f(v), 0);
    expectClose(sum((v) => v.summary.npv), cons.summary.npv);
    expectClose(sum((v) => v.summary.net), cons.summary.net);
    expectClose(sum((v) => v.summary.totalBenefit), cons.summary.totalBenefit);
    expectClose(sum((v) => v.summary.setup), cons.summary.setup);
    for (const m of ['savings', 'run', 'setup', 'humanFte', 'agentVfte'] as const) expectSeriesClose(cons.series[m],
      cons.series[m].map((_, i) => sum((v) => v.series[m][i] as number)));
    // calendar NPV of a product = its own-start NPV discounted by its month 0 (no truncation, no KT lead here)
    for (const v of cons.products) expectClose(v.summary.npv, v.run.headline().npv * Math.pow(1 + cons.rate / 12, -v.month0));
    // wave aggregates add up to the portfolio as well
    expectClose(cons.waves.reduce((a, w) => a + w.summary.npv, 0), cons.summary.npv);
    expectClose(cons.waves.reduce((a, w) => a + w.summary.setup, 0), cons.summary.setup);
  });
});

describe('A7: a product without a wave is excluded and reported', () => {
  it('unscheduled and archived products leave the figures untouched', () => {
    const c = loadCase('golden'), one = envelopeCase(c);
    const pf = withProduct(withProduct(one, { id: 'p2', waveId: null }), { id: 'p3', name: 'Old' });
    const arch = { ...pf, products: pf.products.map((p) => (p.id === 'p3' ? { ...p, archived: true } : p)) };
    const cons = consolidate(arch), ref = consolidate(one);
    expect(cons.excluded).toEqual(['p2', 'p3']);
    expect(cons.products.map((p) => p.id)).toEqual(['p1']);
    for (const m of MEASURES) expect(cons.series[m]).toEqual(ref.series[m]);
    const v = validate(arch);
    expect(v.errors).toEqual([]);
    expect(v.diagnostics.filter((d) => d.code === 'unscheduled').map((d) => d.productId)).toEqual(['p2']);
  });
  it('an unknown wave id is also unscheduled', () => {
    const pf = envelopeCase(loadCase('golden')), bad = { ...pf, products: [{ ...pf.products[0]!, waveId: 'ghost' }] };
    expect(consolidate(bad).excluded).toEqual(['p1']);
    expect(consolidate(bad).summary.paybackMonth).toBeNull();
  });
});

describe('payback is not read before the first movement', () => {
  it('a wave starting at month 7 pays back at (envelope payback + 6)', () => {
    const c = loadCase('golden'), a = consolidate(envelopeCase(c)), b = consolidate(shiftWaves(envelopeCase(c), 6));
    expect(b.summary.paybackMonth).toBe(a.summary.paybackMonth! + 6);
  });
});
