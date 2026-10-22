import type { Worksheet } from 'exceljs';
import type { SummaryRow } from '@/domain/portfolio';
import { head } from '../style';

export type V = string | number | null;
export const MONEY = '#,##0', PCT = '0.0', RATIO = '0.0000';

/** A "Metric / Value" sheet: the navy header row 1 then one line per figure. Values are written as they come from the domain view (the number format does the rounding). */
export function cardSheet(ws: Worksheet, rows: [string, V, string?][]): void {
  ws.addRow(['Metric', 'Value']);
  for (const [label, value, fmt] of rows) { const r = ws.addRow([label, value]); if (fmt && typeof value === 'number') r.getCell(2).numFmt = fmt; }
  head(ws);
}

/** A titled table under what is already on the sheet: a blank line, a bold title, a shaded header, the rows. `fmts[i]` is the number format of column i. */
export function table(ws: Worksheet, title: string, header: string[], rows: V[][], fmts: (string | undefined)[] = []): void {
  ws.addRow([]);
  ws.addRow([title]).getCell(1).font = { bold: true, size: 12 };
  const h = ws.addRow(header);
  h.eachCell((c) => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } }; });
  for (const cells of rows) {
    const r = ws.addRow(cells);
    cells.forEach((v, i) => { const f = fmts[i]; if (f && typeof v === 'number') r.getCell(i + 1).numFmt = f; });
  }
}

export const HDR_LINES = ['Name', 'Products', 'NPV (calendar)', 'Net', 'Setup', 'Savings', 'Run cost', 'FTE (last month)', 'vFTE (last month)', 'Payback month'];
export const FMT_LINES = [undefined, undefined, MONEY, MONEY, MONEY, MONEY, MONEY, PCT, PCT, undefined];
/** One by-wave / by-product line of the consolidation view, cell by cell. */
export const lineCells = (r: SummaryRow): V[] => [r.name, r.products, r.npv, r.net, r.setup, r.savings, r.run, r.etp, r.vfte, r.paybackMonth ?? 'not reached'];
