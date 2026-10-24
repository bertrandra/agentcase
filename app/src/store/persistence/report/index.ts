/** @calc-zone exports */
import type { CaseState } from '@/domain';
import { resolveProduct, type DisplayScope, type Portfolio } from '@/domain/portfolio';
import { hasPortfolioContent } from '../portfolioSnapshot';
import { reportBlocker, reportData } from './data';
import { portfolioReportData, type StressInput } from './portfolio/data';
import { renderPortfolioReport } from './portfolio/render';
import { renderReport } from './render';
import type { ThemeValues } from '@/domain/theme';

export { reportBlocker, reportData, type ReportData } from './data';
export { esc, renderReport } from './render';

export type ReportResult = { ok: true; filename: string; html: string; norms: number; artefacts: number } | { ok: false; reason: string };

/** The Critical & Regulated Software Delivery report of a case as a standalone HTML file (legacy exportCriticalReport). */
export function buildCriticalReport(s: CaseState, print: Readonly<ThemeValues>, now: Date = new Date()): ReportResult {
  const reason = reportBlocker(s);
  if (reason) return { ok: false, reason };
  const d = reportData(s, now);
  return { ok: true, filename: `AgentCase_Critical_Regulated_Report_${d.stamp.replace(/-/g, '')}.html`, html: renderReport(d, print), norms: d.norms.length, artefacts: d.artefactsInScope };
}

const slug = (s: string): string => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'wave';

/**
 * The report for a DISPLAY SCOPE. Product (the active product, or `productId`) and any plain single case: today's report of the product's effective
 * case, byte for byte. Portfolio and Wave: the portfolio report (context, consolidated economics by wave and product, knowledge transfer, gated
 * trajectory, and the last portfolio stress when `stress` is given) built from the domain views `consolidationView` / `portfolioHeadline` /
 * `knowledgeTable`; its gate needs the regulatory catalogue and a norm
 * for at least one product of the scope. Both variants are scriptless and load no external resource. `print`: the base theme of the export
 * (controllers/exportTheme.ts).
 */
export function buildScopedReport(
  pf: Portfolio, scope: DisplayScope, print: Readonly<ThemeValues>, now: Date = new Date(), productId?: string, stress?: StressInput,
): ReportResult {
  if (scope.kind === 'product' || !hasPortfolioContent(pf)) return buildCriticalReport(resolveProduct(pf, productId ?? pf.activeProductId), print, now);
  const d = portfolioReportData(pf, scope, now, stress);
  if (!d) return { ok: false, reason: 'That wave does not exist any more.' };
  const first = d.reg[0], reason = !first ? 'The selected scope has no planned product.' : d.reg.every((r) => !r.data) ? reportBlocker(resolveProduct(pf, first.id)) : null;
  if (reason) return { ok: false, reason };
  const tag = d.kind === 'wave' ? `Wave_${slug(d.label)}_` : 'Portfolio_', norms = new Set(d.reg.flatMap((r) => r.data?.norms ?? []));
  return {
    ok: true, filename: `AgentCase_Critical_Regulated_Report_${tag}${d.stamp.replace(/-/g, '')}.html`, html: renderPortfolioReport(d, print), norms: norms.size,
    artefacts: d.reg.reduce((a, r) => a + (r.data?.artefactsInScope ?? 0), 0),
  };
}
