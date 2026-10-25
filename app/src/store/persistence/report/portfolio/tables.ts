/** @calc-zone exports */
import { fmtRoiPct } from '@/domain/economics';
import { fmtK } from '@/domain/format';
import type { SummaryRow } from '@/domain/portfolio';
import { esc } from '../render';
import type { PortfolioReportData, YearRow } from './data';

const cell = (x: string, right = false): string => `<td${right ? ' style="text-align:right"' : ''}>${x}</td>`;
const table = (head: string[], body: string[][], right = 1): string =>
  `<table><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((x, i) => cell(x,
    i >= right)).join('')}</tr>`).join('')}</table>`;
export const payback = (m: number | null, horizon: number): string => (m === null ? `not within ${horizon} months` : `month ${m}`);

/** By-wave / by-product lines of the consolidation view (calendar NPV: the lines add up to the portfolio). */
export function lines(title: string, rows: SummaryRow[], horizon: number): string {
  return table([title, 'Products', 'NPV', 'Net', 'Setup', 'Savings', 'Run cost', 'FTE', 'vFTE', 'Payback'],
    rows.map((r) => [esc(r.name), String(r.products), fmtK(r.npv), fmtK(r.net), fmtK(r.setup), fmtK(r.savings), fmtK(r.run), r.etp.toFixed(1),
      r.vfte.toFixed(1), payback(r.paybackMonth, horizon)]));
}

export const yearsTable = (years: YearRow[]): string =>
  table(['Calendar year', 'Savings', 'Run cost', 'Setup', 'Net'], years.map((y) => [esc(y.label), fmtK(y.savings), fmtK(y.run), fmtK(y.setup), fmtK(y.net)]));

/** The headline of the scope in one sentence (the same figures as the Consolidation cards). */
export function headlineText(d: PortfolioReportData): string {
  const h = d.headline;
  return `NPV ${fmtK(h.npv)} (calendar, ${(h.npvRate * 100).toFixed(1)}% a year) · ROI ${fmtRoiPct(h.roi)} · benefits ${fmtK(h.totalBenefit)} · setup ${fmtK(h.setup)} · net ${fmtK(h.net)} · payback ${payback(h.paybackMonth, d.horizon)}`
    + ` · velocity +${Math.round(h.velocityPct)}% · effective automation ${h.eff.toFixed(1)}% under a ${Math.round(h.ceiling)}% glass ceiling.`;
}

/** Regulatory context and AI authority per product (the legacy report's sections 1, 3 and 4, one line per product). */
export function regTable(d: PortfolioReportData): string {
  return table(['Product', 'Context', 'Norms', 'Regulatory artifacts', 'Authority cap', 'Blocked artifacts', 'Risk bar'], d.reg.map((r) => (r.data
    ? [esc(r.name), esc(r.data.context), r.data.norms.map(esc).join(', '), String(r.data.artefactsInScope), `A${r.data.authorityCap}`,
      String(r.data.blocked.length), `+${r.data.riskPremium} pts`]
    : [esc(r.name), '—', 'catalogue off or no norm selected', '—', '—', '—', '—'])), 99);
}

export function glassTable(d: PortfolioReportData): string {
  return table(['Product', 'Potential', 'Ceiling', 'Effective', 'Headroom'], d.reg.flatMap((r) => (r.data
    ? [[esc(r.name), `${Math.round(r.data.potential)}%`, `${Math.round(r.data.ceiling)}%`, `${r.data.effective.toFixed(1)}%`,
      `${Math.round(r.data.headroom)} pts`]] : [])));
}

export function supervisionTable(d: PortfolioReportData): string {
  return table(['Product', 'Supervision floors by phase'], d.reg.flatMap((r) => (r.data
    ? [[esc(r.name), r.data.supervision.map((s) => `${esc(s.phase)} ${Math.round(s.floor)}% (${esc(s.posture)})`).join(' · ')]] : [])), 99);
}
