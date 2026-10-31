/** @calc-zone portfolio-consolidation */
import { calendarOf } from './calendar';
import type { Consolidated } from './consolidate';
import { consolidationView, summaryRow, type ChartView, type ConsolidationView, type SummaryRow } from './consolidationView';
import { scopeHeadline, type DisplayScope, type PortfolioHeadline } from './portfolioHeadline';
import { groupOf, scopeKey, type GroupScope } from './scopeGroup';
import type { Portfolio } from './types';

/** A planned product of the selection as a table line: the consolidation's own line plus where it sits in time. */
export interface SelectionRow extends SummaryRow { wave: string; month0: number }

/**
 * The consolidated figures of a View other than a product (Portfolio, one Wave or one Unit), shaped for the result sections (aggregate view): the
 * headline of the selection, one line per planned product, the selection as a total line (the lines add up to it), calendar years, a
 * cumulative-cash chart and what the selection leaves out. Nothing is computed here: every number is read from the consolidation (`consolidate`,
 * `groupOf`, `scopeHeadline`, `consolidationView`).
 */
export interface SelectionView {
  scope: GroupScope['kind'];
  label: string;
  waveId?: string;
  unitId?: string;
  headline: PortfolioHeadline;
  rows: SelectionRow[];
  totals: SummaryRow;
  years: ConsolidationView['years'];
  /** cumulative cash by calendar month: the selection, then one line per product */
  chart: ChartView;
  /** products of the selection left out of the figures (no wave, or archived) */
  excluded: ConsolidationView['excluded'];
  diagnostics: ConsolidationView['diagnostics'];
}

const cache = new WeakMap<Consolidated, Map<string, SelectionView | null>>();

function build(pf: Portfolio, c: Consolidated, scope: DisplayScope): SelectionView | null {
  const sh = scopeHeadline(c, scope), g = scope.kind === 'product' ? null : groupOf(c, scope);
  if (!sh || !g || scope.kind === 'product') return null;
  const cv = consolidationView(pf, c), { headline, label } = sh, all = scope.kind === 'portfolio';
  const waveName = (id: string) => pf.waves.find((w) => w.id === id)?.name ?? '', members = new Set([...g.items.map((v) => v.id), ...g.excludedIds]);
  const { savings, run, setup, net } = headline.years, cal = calendarOf(pf);
  const lines = g.items.map((v) => ({ label: v.name, data: v.summary.cum }));
  return {
    scope: scope.kind, label, waveId: scope.kind === 'wave' ? scope.id : undefined, unitId: scope.kind === 'unit' ? scope.id : undefined, headline,
    rows: g.items.map((v) => ({ ...summaryRow(v.id, v.name, 1, v.series, v.summary), wave: waveName(v.waveId), month0: v.month0 })),
    totals: all ? cv.totals : summaryRow(scope.id, label, g.items.length, g.series, g.summary),
    years: savings.map((s, i) => ({ label: `Year ${i + 1}`, savings: s, run: run[i] ?? 0, setup: setup[i] ?? 0, net: net[i] ?? 0 })),
    chart: { labels: Array.from({ length: c.horizon }, (_, i) => cal.dateAt(i)), series: [{ label, data: g.summary.cum }, ...lines] },
    excluded: all ? cv.excluded : g.excludedIds.map((id) => ({ id, name: pf.products.find((p) => p.id === id)?.name ?? id,
      archived: !!pf.products.find((p) => p.id === id)?.archived })),
    diagnostics: all ? cv.diagnostics : cv.diagnostics.filter((d) => d.productId !== undefined && members.has(d.productId)),
  };
}

/** The view of a Portfolio / Wave / Unit selection; null for a Product view or an unknown wave or unit. Memoised on the consolidation. */
export function selectionView(pf: Portfolio, c: Consolidated, scope: DisplayScope): SelectionView | null {
  const key = scopeKey(scope);
  let m = cache.get(c);
  if (!m) { m = new Map(); cache.set(c, m); }
  if (!m.has(key)) m.set(key, build(pf, c, scope));
  return m.get(key) ?? null;
}
