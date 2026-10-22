import type { Workbook } from 'exceljs';
import { fmtRoiPct } from '@/domain/economics';
import type { ConsolidationView } from '@/domain/portfolio';
import { cardSheet, FMT_LINES, HDR_LINES, lineCells, MONEY, PCT, table } from './blocks';

/** Headline figures of a group of planned products, as the Metric / Value cards (the same rows for the portfolio and for a wave). */
export function headlineCards(h: ConsolidationView['headline'], horizon: number, scope: string): [string, string | number | null, string?][] {
  return [
    ['Scope', scope], ['Planned products', h.products], ['Horizon (calendar months)', horizon],
    ['NPV, calendar (EUR)', h.npv, MONEY], ['Annual discount rate', h.npvRate, '0.00%'], [`ROI (${horizon / 12} years)`, fmtRoiPct(h.roi)], ['Total benefits', h.totalBenefit, MONEY],
    ['Setup investment', h.setup, MONEY], ['Net (benefits - setup)', h.net, MONEY], ['Payback (calendar month)', h.paybackMonth ?? `>${horizon}`],
    ['Velocity uplift (%)', h.velocityPct, PCT], ['Effective automation (%)', h.eff, PCT], ['Glass ceiling (%)', h.ceiling, PCT],
    ['Cost reduction, net of setup (share of baseline)', h.costReduction.ok ? h.costReduction.net : null, '0.0%'],
  ];
}

/**
 * Sheet "Portfolio": headline cards, by calendar year, by wave, by product (the total line is the headline), the calendar NPV and what is left out.
 * Every number is read from `consolidationView` / `portfolioHeadline`; nothing is added up here.
 */
export function portfolioSheet(wb: Workbook, name: string, view: ConsolidationView, horizon: number): void {
  const ws = wb.addWorksheet(name), h = view.headline;
  cardSheet(ws, headlineCards(h, horizon, 'Portefeuille'));
  table(ws, 'By calendar year', ['Year', 'Savings', 'Run cost', 'Setup', 'Net'], view.years.map((y) => [y.label, y.savings, y.run, y.setup, y.net]), [undefined, MONEY, MONEY, MONEY, MONEY]);
  table(ws, 'By wave', HDR_LINES, view.waves.map(lineCells), FMT_LINES);
  table(ws, 'By product', HDR_LINES, [...view.products.map(lineCells), lineCells(view.totals)], FMT_LINES);
  table(ws, 'Calendar NPV (each month T discounted from portfolio month 1; the products add up to the portfolio)', ['Line', 'NPV'],
    [['Portefeuille', h.npv], ...view.waves.map((w): [string, number] => [`Wave: ${w.name}`, w.npv]), ...view.products.map((p): [string, number] => [`Product: ${p.name}`, p.npv])], [undefined, MONEY]);
  if (view.excluded.length) table(ws, 'Not in the consolidation', ['Product', 'Reason'], view.excluded.map((e) => [e.name, e.archived ? 'archived' : 'no wave']));
  if (view.diagnostics.length) table(ws, 'Diagnostics', ['Code', 'Message'], view.diagnostics.map((d) => [d.code, d.message]));
  ws.getColumn(1).width = 46;
}
