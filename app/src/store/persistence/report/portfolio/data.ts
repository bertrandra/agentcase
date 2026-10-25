/** @calc-zone exports */
import { appVerTag } from '@/domain/snapshots';
import {
  calendarOf, consolidate, consolidationView, corePortfolio, knowledgeTable, knowledgeTotals, portfolioHeadline, resolveProduct, waveEffects, waveHeadline,
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
  kind: 'portfolio' | 'wave';
  /** "Portfolio" or the wave name */
  label: string;
  horizon: number; start: string; waves: number;
  headline: PortfolioHeadline;
  waveRows: SummaryRow[]; productRows: SummaryRow[]; years: YearRow[];
  reg: RegRow[];
  kt: { rows: KnowledgeRow[]; totals: KnowledgeTotals; effects: WaveEffect[] };
  diagnostics: Issue[];
  hub: Portfolio['hub'];
  /** the last portfolio Monte Carlo, when one exists */
  stress: StressReport | null;
  logo?: { src: string; alt: string };
}

/** The data of the portfolio report for a display scope other than a product ('portfolio' or one 'wave'); null for an unknown wave. */
export function portfolioReportData(source: Portfolio, scope: DisplayScope, now: Date, stress?: StressInput): PortfolioReportData | null {
  const pf = corePortfolio(source), c: Consolidated = consolidate(pf), view = consolidationView(pf, c);
  const wave = scope.kind === 'wave' ? c.waves.find((w) => w.id === scope.id) : undefined;
  if (scope.kind === 'wave' && !wave) return null;
  const ids = (wave ? wave.productIds : c.products.map((v) => v.id)), inScope = new Set(ids);
  const headline = wave ? (waveHeadline(c, wave.id) as PortfolioHeadline) : portfolioHeadline(c);
  const kt = knowledgeTable(pf), rows = kt.rows.filter((r) => (wave ? r.waveId === wave.id : true)), label = (i: number) => `Year ${i + 1}`;
  const years = wave ? headline.years.savings.map((s,
    i) => ({ label: label(i), savings: s, run: headline.years.run[i] ?? 0, setup: headline.years.setup[i] ?? 0, net: headline.years.net[i] ?? 0 }))
    : view.years;
  return {
    version: appVerTag(), stamp: now.toISOString().slice(0, 10), kind: wave ? 'wave' : 'portfolio', label: wave ? wave.name : 'Portfolio',
    horizon: c.horizon, start: calendarOf(pf).dateAt(0), waves: pf.waves.length, headline,
    waveRows: wave ? view.waves.filter((w) => w.id === wave.id) : view.waves, productRows: view.products.filter((p) => inScope.has(p.id)), years,
    reg: ids.map((id) => ({ id, name: pf.products.find((p) => p.id === id)?.name ?? id,
    data: reportBlocker(resolveProduct(pf, id)) ? null : reportData(resolveProduct(pf, id), now) })),
    kt: { rows, totals: knowledgeTotals(rows), effects: waveEffects(pf, kt.rows).filter((w) => (wave ? w.waveId === wave.id : true)) },
    diagnostics: wave ? view.diagnostics.filter((d) => !d.productId || inScope.has(d.productId)) : view.diagnostics, hub: pf.hub,
    stress: stressReport(source, wave ? { kind: 'wave', id: wave.id } : { kind: 'portfolio' }, stress), ...reportLogo(pf.common),
  };
}
