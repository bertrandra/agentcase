import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { caseDiscountRate, engineNow, makeCtx, npvCanonical, paybackMonthsCanonical, type CaseState } from '@/domain';
import { headline } from '@/domain/economics/headline';
import { roiCanonical } from '@/domain/economics/roi';
import { economicsView } from '@/domain/economics/view';
import { VARIABLES } from '@/domain/pdc/variables';
import { evaluateStrategies, resultsCore } from '@/domain/verdict';

const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const load = (id: string) => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;
const withRate = (s: CaseState, r: unknown): CaseState => ({ ...s, MODEL: { ...s.MODEL, CASE: { ...s.MODEL.CASE, discountRate: r as number } } });
const reg = (c: ReturnType<typeof makeCtx>, id: string) => VARIABLES.find((v) => v.id === id)!.get(c);

describe('one economics headline serves every display', () => {
  it.each(ids)('%s: Results, Financial view and registry read the same net / ROI / payback / NPV', (id) => {
    const c = makeCtx(load(id)), h = headline(c), r = resultsCore(c), v = economicsView(c);
    const sum = engineNow(c).years().reduce((a, y) => a + y.savings, 0);
    expect(h.net).toBeCloseTo(sum - h.setup, 6);
    expect(h.roi).toBe(roiCanonical(h.net, h.setup));
    expect(h.paybackMonth).toBe(paybackMonthsCanonical(c));
    expect(h.npv).toBeCloseTo(npvCanonical(c), 6);
    expect([r.net, r.roi]).toEqual([h.net, h.roi]);
    expect([v.net, v.roi, v.payback, v.npv, v.npvRate]).toEqual([h.net, h.roi, h.paybackMonth, h.npv, h.npvRate]);
    expect(reg(c, 'netProfit3y')).toBeCloseTo(h.net, 6);
    expect(reg(c, 'roiPct')).toBeCloseTo((h.roi ?? 0) * 100, 6);
  });
  it.each(ids)('%s: Results payback year == ceil(KPI payback months / 12)', (id) => {
    const c = makeCtx(load(id)), months = paybackMonthsCanonical(c), r = resultsCore(c), h = headline(c);
    // DEV-PAYBACK-NOSETUP: nothing invested and positive savings is "Immediate" (the kernel month stays 1, the displayed payback is 0)
    const shown = h.setup <= 0 ? (h.totalBenefit > 0 ? 'Immediate' : '—') : months == null ? '—' : `Year ${Math.ceil(months / 12)}`;
    expect(r.payback).toBe(shown);
    expect(headline(c).paybackYear).toBe(months == null ? null : Math.ceil(months / 12));
  });
  it('strategies report the payback year of the same engine rule, and one null ROI for "no setup"', () => {
    const c = makeCtx(load('golden')), rows = evaluateStrategies(c);
    rows.forEach((s) => {
      expect(s.computed.roi == null || Number.isFinite(s.computed.roi)).toBe(true);
      expect(s.computed.payback == null || Number.isInteger(s.computed.payback)).toBe(true);
    });
    expect(roiCanonical(5, 0)).toBeNull();
    expect(roiCanonical(Infinity, 10)).toBeNull();
  });
});

describe('the case discount rate has one owner', () => {
  it('defaults to 8 % and clamps to [0, 1]', () => {
    const s = load('golden');
    expect(caseDiscountRate(makeCtx(withRate(s, undefined)))).toBe(0.08);
    expect(caseDiscountRate(makeCtx(withRate(s, NaN)))).toBe(0.08);
    expect(caseDiscountRate(makeCtx(withRate(s, 5)))).toBe(1);
    expect(caseDiscountRate(makeCtx(withRate(s, -1)))).toBe(0);
  });
  it('headline NPV follows the case rate (not a hard-coded 8 %), the engine headline takes the rate explicitly', () => {
    const c = makeCtx(withRate(load('golden'), 0.2)), h = headline(c), eng = engineNow(c);
    expect(h.npvRate).toBe(0.2);
    expect(h.npv).toBeCloseTo(eng.npv(0.2), 6);
    expect(h.npv).not.toBeCloseTo(eng.npv(0.08), 0);
    expect(eng.headline(0.2).npv).toBeCloseTo(h.npv, 6);
    expect(reg(c, 'npv8')).toBeCloseTo(h.npv, 6);
  });
});
