import { calendarOf } from './calendar';
import type { Consolidated } from './consolidate';
import { consolidationView, summaryRow, type ChartView, type ConsolidationView, type SummaryRow } from './consolidationView';
import { scopeHeadline, type DisplayScope, type PortfolioHeadline } from './portfolioHeadline';
import type { Portfolio } from './types';

/** A planned product of the selection as a table line: the consolidation's own line plus where it sits in time. */
export interface SelectionRow extends SummaryRow { wave: string; month0: number }

/**
 * The consolidated figures of a Vue other than a product (Portefeuille or one Vague), shaped for the result sections (Vue agrégée): the headline of the
 * selection, one line per planned product, the selection as a total line (the lines add up to it), calendar years, a cumulative-cash chart and
 * what the selection leaves out. Nothing is computed here: every number is read from the consolidation (`consolidate`, `scopeHeadline`, `consolidationView`).
 */
export interface SelectionView {
  scope: 'portfolio' | 'wave';
  label: string;
  waveId?: string;
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
  const sh = scopeHeadline(c, scope);
  if (!sh || scope.kind === 'product') return null;
  const cv = consolidationView(pf, c), { headline, label } = sh, wave = scope.kind === 'wave' ? c.waves.find((w) => w.id === scope.id) : undefined;
  const items = c.products.filter((v) => !wave || v.waveId === wave.id), waveName = (id: string) => pf.waves.find((w) => w.id === id)?.name ?? '';
  const { savings, run, setup, net } = headline.years, cal = calendarOf(pf);
  const lines = items.map((v) => ({ label: v.name, data: v.summary.cum }));
  return {
    scope: scope.kind, label, waveId: wave?.id, headline,
    rows: items.map((v) => ({ ...summaryRow(v.id, v.name, 1, v.series, v.summary), wave: waveName(v.waveId), month0: v.month0 })),
    totals: wave ? (cv.waves.find((w) => w.id === wave.id) as SummaryRow) : cv.totals,
    years: savings.map((s, i) => ({ label: `Année ${i + 1}`, savings: s, run: run[i] ?? 0, setup: setup[i] ?? 0, net: net[i] ?? 0 })),
    chart: { labels: Array.from({ length: c.horizon }, (_, i) => cal.dateAt(i)), series: [{ label, data: wave ? wave.summary.cum : c.summary.cum }, ...lines] },
    excluded: wave ? wave.productIds.filter((id) => !items.some((v) => v.id === id)).map((id) => ({ id, name: pf.products.find((p) => p.id === id)?.name ?? id, archived: !!pf.products.find((p) => p.id === id)?.archived })) : cv.excluded,
    diagnostics: wave ? cv.diagnostics.filter((d) => d.productId !== undefined && wave.productIds.includes(d.productId)) : cv.diagnostics,
  };
}

/** The view of a Portefeuille / Vague selection; null for a Produit view or an unknown wave. Memoised on the consolidation. */
export function selectionView(pf: Portfolio, c: Consolidated, scope: DisplayScope): SelectionView | null {
  const key = scope.kind === 'wave' ? `wave:${scope.id}` : scope.kind;
  let m = cache.get(c);
  if (!m) { m = new Map(); cache.set(c, m); }
  if (!m.has(key)) m.set(key, build(pf, c, scope));
  return m.get(key) ?? null;
}
