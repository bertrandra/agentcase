/** @calc-zone exports */
import { appVerTag } from '@/domain/snapshots';
import {
  calendarOf, consolidate, consolidationView, corePortfolio, groupOf, knowledgeTable, knowledgeTotals, resolveProduct, scopeHeadline, summaryRow, waveEffects,
  type Consolidated, type DisplayScope, type Issue, type KnowledgeRow, type KnowledgeTotals, type Portfolio, type PortfolioHeadline, type SummaryRow,
  type WaveEffect,
} from '@/domain/portfolio';
import { reportBlocker, reportData, reportLogo, type ReportData } from '../data';
import { stressReport, type StressReport } from './stress';

export type StressInput = Parameters<typeof stressReport>[2];
export interface RegRow { id: string; name: string; data: ReportData | null }
export interface YearRow { label: string; savings: number; run: number; setup: number; net: number }

/** Everything the portfolio report prints: views of the domain for the scope (nothing is recomputed here), plus each product's regulatory figures. */
export interface PortfolioReportData {
  version: string; stamp: string;
  kind: 'portfolio' | 'wave' | 'unit';
  /** "Portfolio", the wave name or the unit name */
  label: string;
  horizon: number; start: string; waves: number;
  headline: PortfolioHeadline;
  waveRows: SummaryRow[]; productRows: SummaryRow[]; years: YearRow[];
  reg: RegRow[];
  kt: { rows: KnowledgeRow[]; totals: KnowledgeTotals; effects: WaveEffect[] };
  diagnostics: Issue[];
  hub: Portfolio['hub'];
  /** the last portfolio Monte Carlo, when one exists (not for a unit yet) */
  stress: StressReport | null;
  logo?: { src: string; alt: string };
}

/**
 * The data of the portfolio report for a display scope other than a product ('portfolio', one 'wave' or one 'unit' of the organisation tree, F-B81);
 * null for an unknown wave or unit. The selection is the one owner's (`groupOf`); a unit's stress is not available yet (strategy per unit, B10d).
 */
export function portfolioReportData(source: Portfolio, scope: DisplayScope, now: Date, stress?: StressInput): PortfolioReportData | null {
  const pf = corePortfolio(source), c: Consolidated = consolidate(pf), view = consolidationView(pf, c);
  const g = scope.kind === 'product' ? null : groupOf(c, scope), sh = scopeHeadline(c, scope);
  if (!g || !sh || scope.kind === 'product') return null;
  const all = scope.kind === 'portfolio', wave = scope.kind === 'wave' ? scope.id : null, ids = g.items.map((v) => v.id), inScope = new Set(ids);
  const members = new Set([...ids, ...g.excludedIds]), headline = sh.headline, label = (i: number) => `Year ${i + 1}`;
  const kt = knowledgeTable(pf), rows = kt.rows.filter((r) => (all ? true : wave ? r.waveId === wave : members.has(r.productId)));
  const years = all ? view.years : headline.years.savings.map((s,
    i) => ({ label: label(i), savings: s, run: headline.years.run[i] ?? 0, setup: headline.years.setup[i] ?? 0, net: headline.years.net[i] ?? 0 }));
  const effects = scope.kind === 'unit' ? waveEffects(pf, rows).filter((w) => w.products > 0)
    : waveEffects(pf, kt.rows).filter((w) => (wave ? w.waveId === wave : true));
  return {
    version: appVerTag(), stamp: now.toISOString().slice(0, 10), kind: scope.kind, label: g.label,
    horizon: c.horizon, start: calendarOf(pf).dateAt(0), waves: pf.waves.length, headline,
    waveRows: all ? view.waves : wave ? view.waves.filter((w) => w.id === wave)
      : [summaryRow(scope.id, g.label, ids.length, g.series, g.summary)],   // a unit: its own line (a wave can span units)
    productRows: view.products.filter((p) => inScope.has(p.id)), years,
    reg: ids.map((id) => ({ id, name: pf.products.find((p) => p.id === id)?.name ?? id,
      data: reportBlocker(resolveProduct(pf, id)) ? null : reportData(resolveProduct(pf, id), now) })),
    kt: { rows, totals: knowledgeTotals(rows), effects },
    diagnostics: all ? view.diagnostics : view.diagnostics.filter((d) => (!d.productId || (wave ? inScope : members).has(d.productId))
      && (!d.waveId || d.waveId === wave)),
    hub: pf.hub, stress: scope.kind === 'unit' ? null : stressReport(source, scope, stress), ...reportLogo(pf.common),
  };
}
