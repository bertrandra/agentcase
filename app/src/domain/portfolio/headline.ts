/** @calc-zone portfolio-consolidation */
import { paybackYearOf, type Headline } from '../economics/headline';
import { roiCanonical } from '../economics/roi';
import type { ProductRun } from './run';
import { byYear, cumulative, type Series } from './series';

/** The money headline of any set of products (portfolio, wave, product) on the calendar axis, shaped like the single-case `Headline`. */
export interface Summary extends Headline {
  /** cumulative cash by calendar month */
  cum: number[];
  /** first calendar month with a cash movement: a payback cannot precede it */
  first: number;
}

/**
 * Same owners as a single case: ROI is `roiCanonical`, payback is the first month the cumulative cash is >= 0 (not before the first
 * movement, so a wave starting at month 7 does not "pay back" in month 1), NPV discounts each calendar month T by (1 + r/12)^T.
 */
export function summarize(s: Series, first: number, rate: number): Summary {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0), cum = cumulative(s.net), dr = rate / 12;
  let paybackMonth: number | null = null, npv = 0;
  for (let T = 1; T <= s.net.length; T++) {
    if (paybackMonth === null && T >= first && (cum[T - 1] as number) >= 0) paybackMonth = T;
    npv += (s.net[T - 1] as number) / Math.pow(1 + dr, T);
  }
  const setup = sum(s.setup), net = sum(s.net);
  return { totalBenefit: sum(s.savings), setup, net, roi: roiCanonical(net, setup), paybackMonth, paybackYear: paybackYearOf(paybackMonth), npv, npvRate: rate, cum, first };
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

/** Portfolio cost reduction over the products' horizons (the single-case `costReduction`, summed by its components): (savings - setup) / baseline cost. */
export function portfolioCostReduction(runs: ProductRun[]) {
  let years = 0, base = 0, sav = 0, setup = 0;
  for (const r of runs) { const c = r.cost(); years = Math.max(years, c.years); base += c.base; sav += c.sav; setup += c.setup; }
  if (!(base > 0)) return { years, net: 0, gross: 0, base, tobe: 0, setup, ok: false };
  return { years, net: (sav - setup) / base, gross: sav / base, base, tobe: base - sav + setup, setup, ok: true };
}
