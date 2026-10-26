/** @calc-zone portfolio-consolidation */
import { paybackYearOf, type Headline } from '../economics/headline';
import { cashflowSummary, roiCanonical } from '../economics/cashflow';
import { model } from '../model/overlay';
import type { ProductRun } from './run';
import { keptMonths } from './timeline';
import type { ProductView } from './waves';
import { byYear, type Series } from './series';

/** The money headline of any set of products (portfolio, wave, product) on the calendar axis, shaped like the single-case `Headline`. */
export interface Summary extends Headline {
  /** cumulative cash by calendar month */
  cum: number[];
  /** first calendar month with a cash movement: a payback cannot precede it */
  first: number;
}

/**
 * Same owners as a single case, the cash-flow kernel (`economics/cashflow.ts`): ROI is `roiCanonical`, payback is the first month the cumulative cash
 * is >= 0 (not before the first movement, so a wave starting at month 7 does not "pay back" in month 1), NPV discounts each calendar month T by (1 + r/12)^T.
 */
export function summarize(s: Series, first: number, rate: number): Summary {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0), cf = cashflowSummary(s.net, { annualRate: rate, firstMonth: first });
  const setup = sum(s.setup), net = sum(s.net);
  return { totalBenefit: sum(s.savings), setup, net, roi: roiCanonical(net, setup), paybackMonth: cf.paybackMonth,
    paybackYear: paybackYearOf(cf.paybackMonth), npv: cf.npv, npvRate: rate, cum: cf.cumulative, first };
}

/** Calendar-year sums of the consolidated flows; the last entry is the last horizon year. */
export function yearTable(s: Series) {
  const savings = byYear(s.savings), run = byYear(s.run), setup = byYear(s.setup), net = byYear(s.net);
  const last = savings.length - 1;
  return { savings, run, setup, net, endYear: { savings: savings[last] ?? 0, run: run[last] ?? 0, index: last + 1 } };
}

/** Velocity uplift weighted by each product's entry headcount. */
export function weightedVelocity(runs: ProductRun[]): number {
  const w = runs.reduce((a, r) => a + r.baseEtp, 0);
  return w > 0 ? runs.reduce((a, r) => a + r.baseEtp * r.velocityPct(), 0) / w : 0;
}

/** Effective automation and glass ceiling (%), weighted by each product's entry headcount. */
export function weightedAutomation(runs: ProductRun[]): { eff: number; ceiling: number } {
  const w = runs.reduce((a, r) => a + r.baseEtp, 0);
  if (!(w > 0)) return { eff: 0, ceiling: 0 };
  const parts = runs.map((r) => ({ w: r.baseEtp, ...r.automation() }));
  return { eff: parts.reduce((a, p) => a + p.w * p.eff, 0) / w, ceiling: parts.reduce((a, p) => a + p.w * p.ceiling, 0) / w };
}

/** What the calendar figures of a planned product read: its run, its calendar series (whose length is the portfolio horizon) and its month 0. */
export type PlacedRun = Pick<ProductView, 'run' | 'series' | 'month0'>;
const total = (a: number[]): number => a.reduce((x, y) => x + y, 0);

/**
 * A product's cost-reduction basis on the calendar: the AS-IS baseline cost of the months it runs inside the portfolio horizon (baselineRun / 12 per
 * month), its savings and setup on those months (the consolidated series). A product that fits the horizon gets exactly its own `costReduction` basis.
 */
export function calendarCost(v: PlacedRun): { months: number; base: number; sav: number; setup: number } {
  const months = keptMonths(v.series.net.length, v.month0, v.run.rows.length);
  return { months, base: ((+model(v.run.ctx).baselineRun || 0) * months) / 12, sav: total(v.series.savings), setup: total(v.series.setup) };
}

/**
 * Total human FTE of a planned product at the portfolio horizon end, on the one definition of the single case (`fte.after`: delivery team plus the
 * agentic run team): the series' last month (held at the product's own horizon end when that comes first); its AS-IS team when it has not started.
 */
export const productFteAfter = (v: PlacedRun): number =>
  (keptMonths(v.series.net.length, v.month0, v.run.rows.length) > 0 ? (v.series.humanFte[v.series.humanFte.length - 1] ?? 0) : v.run.baseEtp);

/**
 * Portfolio cost reduction on the calendar basis (the single-case `costReduction`, summed by its components over the months each product runs inside
 * the portfolio horizon): (savings - setup) / baseline cost; `years` is the portfolio horizon in years.
 */
export function portfolioCostReduction(items: PlacedRun[], horizonMonths: number) {
  let base = 0, sav = 0, setup = 0;
  for (const v of items) { const c = calendarCost(v); base += c.base; sav += c.sav; setup += c.setup; }
  const years = Math.round((horizonMonths / 12) * 10) / 10;
  if (!(base > 0)) return { years, net: 0, gross: 0, base, tobe: 0, setup, ok: false };
  return { years, net: (sav - setup) / base, gross: sav / base, base, tobe: base - sav + setup, setup, ok: true };
}
