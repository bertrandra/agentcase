/** @calc-zone exports */
import type * as XL from 'exceljs';
import { productTeam, sharedLines, type Portfolio } from '@/domain/portfolio';
import { blue, frz, geDV, head, listDV, rangeDV, sheet, ynDV } from '../params/kit';
import { PF_HEADERS, PF_SHEETS } from './names';
import { writeKnowledge } from './writeKnowledge';
import { writeOrg } from './writeOrg';

const ws = (wb: XL.Workbook, name: string, widths: number[]): XL.Worksheet => sheet(wb, name,
  (PF_HEADERS[name] as string[]).map((h, i): [string, number] => [h, widths[i] ?? 12]));
const finish = (w: XL.Worksheet): void => { head(w); frz(w); };
const inputs = (row: XL.Row, n: number): void => { for (let i = 1; i <= n; i++) blue(row.getCell(i)); };

function writeSettings(wb: XL.Workbook, pf: Portfolio): void {
  const w = ws(wb, PF_SHEETS.settings, [30, 24]);
  const rows: [string, string | number][] = [['Hub enabled', pf.hub.enabled ? 'Yes' : 'No'], ['Hub infrastructure (€/month)', pf.hub.infraMonthly],
    ['Hub infrastructure allocation', pf.hub.infraAllocation],
    ['Horizon (months)', pf.horizonMonths], ['Start date (ISO)', pf.startDate], ['Active product id', pf.activeProductId],
      ['Correlation rho (0-1)', pf.rho ?? 0], ['Max products in setup at once (0 = no limit)', pf.maxConcurrentSetups ?? 0]];
  rows.forEach(([k, v]) => inputs(w.addRow([k, v]), 2));
  w.getCell('B2').dataValidation = listDV(['Yes', 'No'], 'Hub enabled');
  w.getCell('B4').dataValidation = listDV(['perProduct', 'byBaseEtp'], 'perProduct: full cost per product; byBaseEtp: shared by entry headcount');
  w.getCell('B7').dataValidation = rangeDV(0, 1, false, 'Correlation between products in the portfolio Monte Carlo: 0 = independent, 1 = common shocks');
  w.getCell('B8').dataValidation = geDV(0, 'Transformation-team capacity: products whose setup may overlap; 0 = no limit');
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
  const w = ws(wb, PF_SHEETS.waves, [14, 28, 14, 40, 8, 20, 26, 12]);
  pf.waves.forEach((x, i) => { const d = x.dependsOn;
    inputs(w.addRow([x.id, x.name, x.startMonth, x.note ?? '', i + 1, d?.waveId ?? '', d?.milestone ?? '', d ? d.lagMonths : '']), 8); });
  for (let r = 2; r <= pf.waves.length + 1; r++) w.getCell(`G${r}`).dataValidation =
    listDV(['start', 'setupEnd'], 'start: after its start; setupEnd: after its last product finishes setup');
  finish(w);
}

function writeTeams(wb: XL.Workbook, pf: Portfolio): void {
  const w = ws(wb, PF_SHEETS.team, [16, 16, 9, 12, 8, 46]);
  pf.products.forEach((p) => productTeam(pf, p.id).forEach((t) => inputs(w.addRow([p.id, t.skill, t.grade, t.loc, t.etp, (t.pins ?? []).join(';')]), 6)));
  finish(w);
}

/**
 * SharedTeam (only when the portfolio has shared lines): one row per share of a line (line id, skill, grade, location, FTE, product id, share %,
 * pinned artefacts, unit, split rule — B10c; the line's fields repeat on each of its rows).
 */
function writeShared(wb: XL.Workbook, pf: Portfolio): void {
  const lines = sharedLines(pf);
  if (!lines.length) return;
  const w = ws(wb, PF_SHEETS.shared, [12, 16, 9, 12, 8, 16, 10, 46, 18, 12]);
  for (const l of lines) {
    const shares = Object.entries(l.allocations), pins = (l.pins ?? []).join(';'), unit = l.unit ?? '', split = l.split ?? '';
    for (const [pid, pct] of shares.length ? shares : [['', '']]) inputs(w.addRow([l.id, l.skill, l.grade, l.loc, l.etp, pid, pct, pins, unit, split]), 10);
  }
  finish(w);
}

/**
 * The portfolio part of the parameters workbook: settings, products, waves, one team sheet with a Product column, overrides, the knowledge subsets
 * the shared team lines, the units and the owners (FX-30).
 */
export function writePortfolioSheets(wb: XL.Workbook, pf: Portfolio): void {
  writeSettings(wb, pf); writeProducts(wb, pf); writeWaves(wb, pf); writeTeams(wb, pf); writeKnowledge(wb, pf, ws, finish, inputs); writeShared(wb, pf);
  writeOrg(wb, pf, ws, finish, inputs);
}
