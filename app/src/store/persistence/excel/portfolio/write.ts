/** @calc-zone exports */
import type * as XL from 'exceljs';
import type { Portfolio } from '@/domain/portfolio';
import { blue, frz, geDV, head, listDV, rangeDV, sheet, ynDV } from '../params/kit';
import { PF_HEADERS, PF_SHEETS } from './names';
import { writeKnowledge } from './writeKnowledge';

const ws = (wb: XL.Workbook, name: string, widths: number[]): XL.Worksheet => sheet(wb, name,
  (PF_HEADERS[name] as string[]).map((h, i): [string, number] => [h, widths[i] ?? 12]));
const finish = (w: XL.Worksheet): void => { head(w); frz(w); };
const inputs = (row: XL.Row, n: number): void => { for (let i = 1; i <= n; i++) blue(row.getCell(i)); };

function writeSettings(wb: XL.Workbook, pf: Portfolio): void {
  const w = ws(wb, PF_SHEETS.settings, [30, 24]);
  const rows: [string, string | number][] = [['Hub enabled', pf.hub.enabled ? 'Yes' : 'No'], ['Hub infrastructure (€/month)', pf.hub.infraMonthly],
  ['Hub infrastructure allocation', pf.hub.infraAllocation],
    ['Horizon (months)', pf.horizonMonths], ['Start date (ISO)', pf.startDate], ['Active product id', pf.activeProductId],
      ['Correlation rho (0-1)', pf.rho ?? 0]];
  rows.forEach(([k, v]) => inputs(w.addRow([k, v]), 2));
  w.getCell('B2').dataValidation = listDV(['Yes', 'No'], 'Hub enabled');
  w.getCell('B4').dataValidation = listDV(['perProduct', 'byBaseEtp'], 'perProduct: full cost per product; byBaseEtp: shared by entry headcount');
  w.getCell('B7').dataValidation = rangeDV(0, 1, false, 'Correlation between products in the portfolio Monte Carlo: 0 = independent, 1 = common shocks');
  finish(w);
}

function writeProducts(wb: XL.Workbook, pf: Portfolio): void {
  const w = ws(wb, PF_SHEETS.products, [16, 28, 14, 14, 14, 40, 10]);
  pf.products.forEach((p) => {
    const at = pf.waves.find((x) => x.id === p.waveId)?.productIds.indexOf(p.id) ?? -1;
    inputs(w.addRow([p.id, p.name, p.waveId ?? '', p.offsetMonths, at >= 0 ? at + 1 : '', p.note ?? '', p.archived ? 'Yes' : '']), 7);
  });
  for (let r = 2; r <= pf.products.length + 1; r++) { w.getCell(`D${r}`).dataValidation = geDV(0, 'Months ≥ 0'); w.getCell(`G${r}`).dataValidation = ynDV(); }
  finish(w);
}

function writeWaves(wb: XL.Workbook, pf: Portfolio): void {
  const w = ws(wb, PF_SHEETS.waves, [14, 28, 14, 40, 8]);
  pf.waves.forEach((x, i) => inputs(w.addRow([x.id, x.name, x.startMonth, x.note ?? '', i + 1]), 5));
  finish(w);
}

function writeTeams(wb: XL.Workbook, pf: Portfolio): void {
  const w = ws(wb, PF_SHEETS.team, [16, 16, 9, 12, 8, 46]);
  pf.products.forEach((p) => p.teamIn.forEach((t) => inputs(w.addRow([p.id, t.skill, t.grade, t.loc, t.etp, (t.pins ?? []).join(';')]), 6)));
  finish(w);
}

/** The portfolio part of the parameters workbook: settings, products, waves, one team sheet with a Product column, overrides and the knowledge subsets. */
export function writePortfolioSheets(wb: XL.Workbook, pf: Portfolio): void {
  writeSettings(wb, pf); writeProducts(wb, pf); writeWaves(wb, pf); writeTeams(wb, pf); writeKnowledge(wb, pf, ws, finish, inputs);
}
