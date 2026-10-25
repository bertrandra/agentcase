/** @calc-zone portfolio-consolidation */
import { calendarOf } from './calendar';
import type { Consolidated } from './consolidate';
import type { Summary } from './headline';
import { portfolioHeadline, type PortfolioHeadline } from './portfolioHeadline';
import type { Series } from './series';
import type { Portfolio } from './types';
import { validate, type Issue } from './validate';

/** One line of the by-wave / by-product tables (calendar figures, NPV discounted from portfolio month 1: the sum of the products is the portfolio NPV). */
export interface SummaryRow {
  id: string;
  name: string;
  /** planned products behind the line (1 for a product) */
  products: number;
  npv: number;
  net: number;
  setup: number;
  savings: number;
  run: number;
  /** human ETP and agent vFTE in the last horizon month */
  etp: number;
  vfte: number;
  paybackMonth: number | null;
}

export interface ChartView { labels: string[]; series: { label: string; data: number[] }[] }

export interface ConsolidationView {
  headline: PortfolioHeadline;
  /** cumulative cash by calendar month: the portfolio, then one line per wave that has planned products */
  chart: ChartView;
  waves: SummaryRow[];
  products: SummaryRow[];
  /** the portfolio headline as a table line (the by-wave and by-product lines add up to it) */
  totals: SummaryRow;
  /** calendar years: savings, run, setup, net */
  years: { label: string; savings: number; run: number; setup: number; net: number }[];
  /** products left out of the consolidation (no wave, or archived) */
  excluded: { id: string; name: string; archived: boolean }[];
  /** unscheduled products, capped preparation, truncated products, capped targets, unused hub */
  diagnostics: Issue[];
}

const last = (a: number[]): number => a[a.length - 1] ?? 0;
const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
export const summaryRow = (id: string, name: string, products: number, s: Series, m: Summary): SummaryRow => ({
  id, name, products, npv: m.npv, net: m.net, setup: m.setup, savings: m.totalBenefit, run: sum(s.run), etp: last(s.humanFte), vfte: last(s.agentVfte),
  paybackMonth: m.paybackMonth,
});

const CODES = ['unscheduled', 'target-capped', 'kt-lead-clamped', 'hub-unused'];

function diagnosticsOf(pf: Portfolio, c: Consolidated): Issue[] {
  const out = validate(pf).diagnostics.filter((d) => CODES.includes(d.code));
  for (const v of c.products) {
    if (v.run.rows.length > c.horizon - v.month0) out.push({ code: 'truncated',
      message: `${v.name}: cut at the portfolio horizon (${c.horizon} months); ${v.run.rows.length - Math.max(0, c.horizon - v.month0)} of its months fall beyond`, productId: v.id });
  }
  return out;
}

/** Everything the Consolidation section shows, from the consolidated series (nothing is recomputed: lines, totals and chart are read from it). */
export function consolidationView(pf: Portfolio, c: Consolidated): ConsolidationView {
  const headline = portfolioHeadline(c), cal = calendarOf(pf), name = (id: string) => pf.products.find((p) => p.id === id)?.name ?? id;
  const filled = c.waves.filter((w) => w.productIds.length > 0);
  const chart: ChartView = {
    labels: Array.from({ length: c.horizon }, (_, i) => cal.dateAt(i)),
    series: [{ label: 'Portfolio', data: c.summary.cum }, ...filled.map((w) => ({ label: w.name, data: w.summary.cum }))],
  };
  const labelOf = (i: number) => `Year ${i + 1}`;
  const { savings, run, setup, net } = headline.years;
  return {
    headline, chart,
    waves: c.waves.map((w) => summaryRow(w.id, w.name, w.productIds.length, w.series, w.summary)),
    products: c.products.map((v) => summaryRow(v.id, v.name, 1, v.series, v.summary)),
    totals: summaryRow('total', 'Portfolio', c.products.length, c.series, c.summary),
    years: savings.map((s, i) => ({ label: labelOf(i), savings: s, run: run[i] ?? 0, setup: setup[i] ?? 0, net: net[i] ?? 0 })),
    excluded: c.excluded.map((id) => ({ id, name: name(id), archived: !!pf.products.find((p) => p.id === id)?.archived })),
    diagnostics: diagnosticsOf(pf, c),
  };
}
