import { describe, expect, it } from 'vitest';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { engineNow, makeCtx } from '@/domain';
import { economicsView, fmtPayback, fmtRoiPct, monthlySeries, roiCanonical, roiVerdict, savingsBreakdown, yLabel } from '@/domain/economics';
import { fmtE, fmtK } from '@/ui/economicsFormat';
import { legacyMoney } from '../helpers/deviations';
import { diffs, extra, FIXTURES } from '../helpers/economics';
import { readFileSync } from 'node:fs';

const ctxOf = (id: string) => makeCtx(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))));
type Roi = { totalBen: number; net: number; roi: number | null; roiPct: string; payback: number | null; paybackText: string; months: number; npvRate: number;
  npv: number; horizon: number; freed: number[] };

describe('economics domain reproduces the legacy', () => {
  it('has the fixtures', () => expect(FIXTURES.length).toBeGreaterThanOrEqual(56));
  it.each(FIXTURES)('%s: monthlySeries, savingsBreakdown, ROI block', (id) => {
    const c = ctxOf(id), v = economicsView(c), e = extra<Roi>('econ_roi', id);
    expect(diffs(extra('econ_monthly', id), monthlySeries(engineNow(c)))).toEqual([]);
    expect(diffs(extra('econ_savings', id), savingsBreakdown(c))).toEqual([]);
    expect(diffs({ ...e, roi: e.roi ?? 'null', roiPct: e.roiPct, paybackText: e.paybackText, payback: e.payback ?? 'null' },
      { totalBen: v.totalBenefit, net: v.net, roi: v.roi ?? 'null', roiPct: fmtRoiPct(v.roi), payback: v.payback ?? 'null',
        paybackText: fmtPayback(v.payback, v.months.length),
        months: v.months.length, npvRate: v.npvRate, npv: v.npv, horizon: v.H, freed: v.freed })).toEqual([]);
  });
  it('formatting rules match the legacy helpers', () => {
    const f = extra<{ roi: string[]; payback: string[]; fmtK: string[]; fmtE: string[]; yLabel: string[]; roiNull: (number | null)[] }>('econ_fmt', 'golden');
    expect([null, 0, 0.004, 0.3, 1.5, 6.5712, -0.4, 12.345].map(fmtRoiPct)).toEqual(f.roi);
    expect([[null, 36], [0, 36], [1, 36], [9, 36], [Infinity, 60], [undefined, 120]].map(([m, h]) => fmtPayback(m, h as number))).toEqual(f.payback);
    expect([0, 499, 500, 1499, 1500, 1704000, -15379, -400, 1234567, 12345678].map(fmtK)).toEqual(f.fmtK.map(legacyMoney));   // DEV-NEG-MONEY
    expect([0, 0.5, 1.5, 22121.4, -15379.5, 1234567.89].map(fmtE)).toEqual(f.fmtE.map(legacyMoney));
    expect([1, 2, 3, 10].map(yLabel)).toEqual(f.yLabel);
    expect([roiCanonical(5, 0), roiCanonical(NaN, 10), roiCanonical(Infinity, 10), roiCanonical(50, 10)]).toEqual(f.roiNull);
  });
  it('verdict bands and the no-setup edge', () => {
    expect([1.5, 1.49, 0.3, 0.29, 0, -1, null].map(roiVerdict)).toEqual(['go', 'conditional', 'conditional', 'reconsider', 'reconsider', 'reconsider',
      'reconsider']);
    expect(economicsView(ctxOf('econ-no-setup')).roi).toBeNull();
    expect(roiVerdict(economicsView(ctxOf('econ-roi-mid')).roi)).toBe('conditional');
    expect(roiVerdict(economicsView(ctxOf('econ-roi-low')).roi)).toBe('reconsider');
    expect(economicsView(ctxOf('econ-roi-low')).payback).toBeNull();
  });
  it('the view follows the horizon', () => {
    for (const [id, h] of [['horizon-1', 1], ['horizon-2', 2], ['golden', 3], ['horizon-5', 5], ['econ-horizon-7', 7], ['horizon-10', 10]] as const) {
      const v = economicsView(ctxOf(id));
      expect([v.H, v.months.length, v.cumulative.length]).toEqual([h, h * 12, h]);
    }
  });
});
