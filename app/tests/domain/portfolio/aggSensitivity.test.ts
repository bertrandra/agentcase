import { describe, expect, it } from 'vitest';
import { consolidate, envelopeCase, portfolioSensitivity, productCtx, productSeries, sensitivityRuns, summarize, type Portfolio } from '@/domain/portfolio';
import { movedValue, productTornado, TORNADO_DRIVERS } from '@/domain/stress';
import { expectClose, loadCase } from '../../helpers/portfolio';
import { openPortfolioFixture } from '../../helpers/portfolioFixtures';

const SAMPLE = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med', 'horizon-5'];
const ids = (pf: Portfolio) => pf.products.map((p) => p.id);

describe('product tornado', () => {
  const c = productCtx(envelopeCase(loadCase('golden')), envelopeCase(loadCase('golden')).products[0]!.id);
  it('each driver is moved by the same relative step, clamped to its range', () => {
    const d = TORNADO_DRIVERS.find((x) => x.id === 'y3Ramp')!, v = parseFloat(c.inp.v('y3Ramp'));
    expectClose(movedValue(c, d, -1, 10), Math.max(0, v * 0.9)); expectClose(movedValue(c, d, 1, 10), Math.min(100, v * 1.1));
  });
  it('ranked by swing, every driver once; the automation potential moves the net', () => {
    const t = productTornado(c, 10);
    expect(t.rows.map((r) => r.id).sort()).toEqual(TORNADO_DRIVERS.map((d) => d.id).sort());
    for (let i = 1; i < t.rows.length; i++) expect(t.rows[i - 1]!.swing).toBeGreaterThanOrEqual(t.rows[i]!.swing);
    const auto = t.rows.find((r) => r.id === 'autoPotential')!;
    expect(auto.swing).toBeGreaterThan(0); expect(auto.up.net).toBeGreaterThan(auto.down.net);
    expect(productTornado(c, 20).rows.find((r) => r.id === 'autoPotential')!.swing).toBeGreaterThan(auto.swing);
  });
});

describe('one product: the portfolio sensitivity is the product’s own tornado', () => {
  it.each(SAMPLE)('%s', (id) => {
    const pf = envelopeCase(loadCase(id)), only = pf.products[0]!.id;
    const got = portfolioSensitivity(pf, [only], 10), own = productTornado(productCtx(pf, only), 10);
    expectClose(got.base.net, own.base.net); expectClose(got.base.npv, own.base.npv);
    expect(got.rows.map((r) => r.id)).toEqual(own.rows.map((r) => r.id));
    got.rows.forEach((r, i) => {
      const o = own.rows[i]!;
      expectClose(r.down.net, o.down.net); expectClose(r.up.net, o.up.net); expectClose(r.down.npv, o.down.npv); expectClose(r.up.npv, o.up.npv);
      expectClose(r.swing, o.swing);
    });
  });
});

describe('three products (pf-three-products): each driver row is the sum of the shifted product results', () => {
  const pf = openPortfolioFixture('pf-three-products'), cons = consolidate(pf), all = ids(pf), got = portfolioSensitivity(pf, all, 10);
  it('the base is the deterministic consolidation', () => {
    expectClose(got.base.net, cons.summary.net); expectClose(got.base.npv, cons.summary.npv);
    expect(new Set(cons.products.map((v) => v.month0)).size).toBeGreaterThan(1);
  });
  it('net and NPV add up; each product part is its moved case laid on the calendar by the consolidation kernel', () => {
    for (const r of got.rows) {
      expect(r.products.map((p) => p.id)).toEqual(cons.products.map((v) => v.id));
      for (const k of ['net', 'npv'] as const) {
        expectClose(r.down[k], r.products.reduce((a, p) => a + p.down[k], 0)); expectClose(r.up[k], r.products.reduce((a, p) => a + p.up[k], 0));
      }
      for (const p of r.products) {
        const v = cons.products.find((x) => x.id === p.id)!, k = TORNADO_DRIVERS.findIndex((d) => d.id === r.id);
        const s = productSeries(sensitivityRuns(v.run, 10)[k]!.up, v, cons.horizon), sm = summarize(s, s.first, cons.rate);
        expectClose(p.up.net, sm.net); expectClose(p.up.npv, sm.npv);
      }
    }
  });
  it('a wave: its products only', () => {
    const w = cons.waves.find((x) => x.productIds.length)!, g = portfolioSensitivity(pf, w.productIds, 10);
    expect(g.rows[0]!.products.map((p) => p.id)).toEqual(w.productIds);
    expectClose(g.base.npv, w.summary.npv);
  });
  it('memoised per selection and step; the moved cases are kept per product run', () => {
    expect(portfolioSensitivity(pf, all, 10)).toBe(got);
    expect(portfolioSensitivity(pf, all, 20)).not.toBe(got);
    const v = cons.products[0]!;
    expect(sensitivityRuns(v.run, 10)).toBe(sensitivityRuns(v.run, 10));
  });
  it('an empty selection: every driver with zero figures', () => {
    const e = portfolioSensitivity(pf, ['gone'], 10);
    expect(e.rows).toHaveLength(TORNADO_DRIVERS.length);
    for (const r of e.rows) { expect(r.products).toEqual([]); expect(r.swing).toBe(0); }
  });
});
