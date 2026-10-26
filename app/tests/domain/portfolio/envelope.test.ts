import { describe, expect, it } from 'vitest';
import { computeCase, makeCtx } from '@/domain';
import { headline } from '@/domain/economics/headline';
import { horizonYears } from '@/domain/model/horizonYears';
import { consolidate, envelopeCase, portfolioHeadline, portfolioToCase, validate } from '@/domain/portfolio';
import { expectClose, expectSeriesClose, FIXTURE_IDS, loadCase } from '../../helpers/portfolio';

describe('A1: a case wrapped as one product / one wave at month 0 gives the single-case figures', () => {
  it.each(FIXTURE_IDS)('%s', (id) => {
    const c = loadCase(id), cc = computeCase(c), h = headline(makeCtx(c));
    const pf = envelopeCase(c), cons = consolidate(pf), ph = portfolioHeadline(cons);
    expect(cons.excluded).toEqual([]);
    expectClose(ph.net, h.net); expectClose(ph.setup, h.setup); expectClose(ph.totalBenefit, h.totalBenefit);
    expect(ph.roi === null).toBe(h.roi === null);
    if (ph.roi !== null && h.roi !== null) expectClose(ph.roi, h.roi);
    expect(ph.paybackMonth).toBe(cc.payback);
    expect(ph.paybackMonth).toBe(h.paybackMonth);
    expect(ph.paybackYear).toBe(h.paybackYear);
    expectClose(ph.npv, cc.npv);
    expect(ph.npvRate).toBe(h.npvRate);
    // own-start NPV of the single product is computeCase's NPV; at month 0 calendar and own-start NPV coincide
    expectClose(cons.products[0]!.run.headline().npv, cc.npv);
    expectClose(cons.products[0]!.summary.npv, cons.products[0]!.run.headline().npv);
    const hy = horizonYears(makeCtx(c));
    expectSeriesClose(ph.years.savings, hy.sav); expectSeriesClose(ph.years.run, hy.run);
    expect(ph.endYear.index).toBe(cc.endYear.index);
    expectClose(ph.endYear.savings, cc.endYear.savings); expectClose(ph.endYear.run, cc.endYear.run);
    expectClose(ph.velocityPct, cc.velocityPct);
    expect(ph.costReduction.ok).toBe(cc.costReduction.ok);
    for (const k of ['years', 'net', 'gross', 'base', 'tobe', 'setup'] as const) expectClose(ph.costReduction[k], cc.costReduction[k]);
    expect(validate(pf).errors).toEqual([]);
  });

  it.each(FIXTURE_IDS)('%s: F22 round trip returns the same case', (id) => {
    const c = loadCase(id);
    expect(portfolioToCase(envelopeCase(c))).toEqual(c);
  });

  it('the envelope names the product and the wave as the spec asks', () => {
    const pf = envelopeCase(loadCase('golden'));
    expect([pf.products[0]!.name, pf.waves[0]!.name, pf.waves[0]!.startMonth, pf.products[0]!.waveId, pf.hub.infraAllocation])
      .toEqual(['Product 1', 'Wave 1', 0, 'w1', 'perProduct']);
    expect(pf.horizonMonths).toBe(36);
  });

  it('the monthly series of the envelope are the engine rows', () => {
    const c = loadCase('golden'), cons = consolidate(envelopeCase(c)), rows = cons.products[0]!.run.rows;
    expectSeriesClose(cons.series.net, rows.map((r) => r.netSavings));
    expectSeriesClose(cons.series.humanFte, rows.map((r) => r.humanFte + r.runTeamFte));   // total human FTE (delivery + run team)
    expectSeriesClose(cons.series.agentVfte, rows.map((r) => r.agentVfte));
  });
});
