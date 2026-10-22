import { describe, expect, it } from 'vitest';
import { exportResultsWorkbook } from '@/controllers/excelResults';
import { makeCtx, type Ctx } from '@/domain';
import { buildCalcPackage } from '@/domain/calcPackage';
import { economicsView } from '@/domain/economics';
import { headline } from '@/domain/economics/headline';
import { costReduction } from '@/domain/economics/costReduction';
import { fteBeforeAfter } from '@/domain/economics/fte';
import { roiCanonical } from '@/domain/economics/roi';
import { VARIABLES } from '@/domain/pdc/variables';
import { consolidate, envelopeCase, portfolioHeadline } from '@/domain/portfolio';
import { resultsCore } from '@/domain/verdict/results';
import { velocityUpliftPct } from '@/domain/verifyB/velocityUplift';
import { caseResultOf } from '@/store/hooks';
import { appStore } from '@/store/instance';
import { dumpBuffer, loadCase as loadIntoStore } from '../helpers/xlsxDump';
import { close, identical, loadCase, withProduct } from '../helpers/portfolio';

/**
 * "One source, N screens" (docs/ARCHITECTURE.md section 13): a figure is computed by its @owner module and every screen or export that shows it prints that value.
 * Owners: net, total-benefit, roi, payback, npv (economics/headline.ts, economics/roi.ts); saving-pct (costReduction.ts); fte-before-after (fte.ts); velocity-uplift (velocityUplift.ts).
 * Screens compared: the KPI bar (computeCase), Results, Financial (economicsView), the Board variables, the calculation package, the Excel results workbook and the consolidation.
 */
const CASES = ['golden', 'horizon-5', 'ctx-msi', 'econ-no-setup', 'vtax-on'];
const same = (a: number | null | undefined, b: number | null | undefined, what: string, abs = 0): void => {
  if (a == null || b == null) { expect(a ?? null, what).toBe(b ?? null); return; }
  expect(abs ? Math.abs(a - b) <= abs : close(a, b, 1e-9), `${what}: ${a} vs ${b}`).toBe(true);
};
const variable = (id: string, c: Ctx) => VARIABLES.find((v) => v.id === id)!.get(c);

describe.each(CASES)('figure owners: %s', (id) => {
  const state = loadCase(id), c = makeCtx(state), h = headline(c);

  it('the KPI bar (computeCase), Results, Financial and the calculation package print the owner headline', () => {
    const kpi = caseResultOf(state);
    same(kpi.payback, h.paybackMonth, 'KPI payback month'); same(kpi.npv, h.npv, 'KPI npv');
    same(kpi.headline.roi, h.roi, 'KPI roi'); same(kpi.headline.totalSavings, h.net, 'KPI engine totalSavings (savings net of setup)');
    const r = resultsCore(c);
    same(r.net, h.net, 'Results net'); same(r.roi, h.roi, 'Results roi');
    expect(r.payback).toBe(h.paybackYear == null ? '—' : `Year ${h.paybackYear}`);
    const e = economicsView(c);
    same(e.net, h.net, 'Financial net'); same(e.roi, h.roi, 'Financial roi'); same(e.payback, h.paybackMonth, 'Financial payback'); same(e.npv, h.npv, 'Financial npv'); same(e.totalBenefit, h.totalBenefit, 'Financial total benefit');
    const p = buildCalcPackage(state).headline;
    same(p.payback, h.paybackMonth, 'package payback'); same(p.npv, h.npv, 'package npv'); same(p.roi, h.roi, 'package roi'); same(p.totalSavings, h.net, 'package totalSavings (savings net of setup)');
  });
  it('the Board variables read the owner', () => {
    same(variable('netProfit3y', c) as number, h.net, 'board net');
    same(variable('roiPct', c) as number, (h.roi ?? 0) * 100, 'board roi');
    same(variable('paybackMonths', c) as number | null, h.paybackMonth, 'board payback');
    same(variable('npv8', c) as number, h.npv, 'board npv');
    same(variable('npvHeadlineResults', c) as number, h.npv, 'board headline npv');
  });
  it('the other owned figures: saving %, FTE before / after and velocity are what the KPI bar prints', () => {
    const kpi = caseResultOf(state), cr = costReduction(c);
    expect(kpi.costReduction).toEqual(cr);
    expect(kpi.fte).toEqual(fteBeforeAfter(kpi.model.base.etp, kpi.fte.after));
    expect(kpi.velocityPct).toBe(velocityUpliftPct(c));
  });
  it('the Excel results workbook shows the owner net, total benefit, setup and payback', async () => {
    loadIntoStore(id);
    const sheet = (await dumpBuffer(await (await exportResultsWorkbook()).blob.arrayBuffer())).find((s) => s.name === 'ROI')!;
    const live = headline(makeCtx(appStore().getState().doc));
    same(sheet.rows.find((r) => String(r[0]).startsWith('Net profit'))?.[1] as number, live.net, 'Excel net', 0.5);
    same(sheet.rows.find((r) => String(r[0]).startsWith('Total benefits'))?.[1] as number, live.totalBenefit, 'Excel total benefit', 0.5);
    same(sheet.rows.find((r) => r[0] === 'Setup investment')?.[1] as number, live.setup, 'Excel setup', 0.5);
    const pb = sheet.rows.find((r) => String(r[0]).startsWith('Payback'))?.[1];
    if (live.paybackMonth != null && live.paybackMonth > 0) expect(pb).toBe(live.paybackMonth);
  });
  it('the consolidation of a one-product portfolio is the owner headline', () => {
    const pf = envelopeCase(state), ph = portfolioHeadline(consolidate(pf));
    same(ph.net, h.net, 'portfolio net'); same(ph.totalBenefit, h.totalBenefit, 'portfolio total'); same(ph.setup, h.setup, 'portfolio setup');
    same(ph.roi, h.roi, 'portfolio roi'); same(ph.paybackMonth, h.paybackMonth, 'portfolio payback');
  });
});

describe('figure owners: multi-product portfolios', () => {
  it('the portfolio headline is the sum of its products on the calendar; ROI is the owner rule on the sums; a product at month 0 is its owner headline', () => {
    const base = envelopeCase(loadCase('golden'));
    for (const pf of [identical(loadCase('golden'), 3), withProduct(withProduct(base, { id: 'b' }), { id: 'c', offset: 4 })]) {
      const con = consolidate(pf), ph = portfolioHeadline(con), sum = (f: (s: (typeof con.products)[number]['summary']) => number): number => con.products.reduce((a, p) => a + f(p.summary), 0);
      same(ph.net, sum((s) => s.net), 'portfolio net = sum of the calendar nets');
      same(ph.totalBenefit, sum((s) => s.totalBenefit), 'portfolio total benefit');
      same(ph.setup, sum((s) => s.setup), 'portfolio setup');
      same(ph.roi, roiCanonical(ph.net, ph.setup), 'portfolio roi = roiCanonical(net, setup)');
      const first = con.products.find((p) => p.month0 === 0 && p.lead === 0);
      if (first) { same(first.summary.net, first.run.headline().net, 'a product at month 0: calendar net = owner net'); same(first.summary.roi, first.run.headline().roi, 'a product at month 0: calendar roi = owner roi'); }
    }
  });
});
