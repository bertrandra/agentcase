/** @calc-zone exports */
import type * as XL from 'exceljs';
import type { CostModel, RateCardBlock } from '@/domain/portfolio';
import { FIRST, txt } from './layout';
import { xlArgb } from '../print';

const NAVY = (ws: XL.Worksheet): string => xlArgb(ws.workbook, 'excel-head-bg');

/**
 * A titled block of rows under a monthly table: title row, header row, then the data from `row + 2` (the first data row). `cols` gives the sheet
 * column of each field.
 */
export function writeBlock(ws: XL.Worksheet, row: number, title: string, heads: string[], rows: (string | number)[][], cols?: number[]): number {
  const at = (i: number) => cols?.[i] ?? i + 1;
  ws.getCell(row, 1).value = txt(title); ws.getCell(row, 1).font = { bold: true, size: 12, color: { argb: NAVY(ws) } };
  heads.forEach((h, i) => {
    const c = ws.getCell(row + 1, at(i));
    c.value = txt(h); c.font = { bold: true, color: { argb: xlArgb(ws.workbook, 'excel-head-text') } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY(ws) } }; c.alignment = { wrapText: true };
  });
  rows.forEach((r, k) => r.forEach((v, i) => {
    const c = ws.getCell(row + 2 + k, at(i));
    c.value = typeof v === 'number' ? v : txt(v);
    if (typeof v === 'number') c.numFmt = '#,##0.######';
  }));
  return row + 2 + rows.length;
}

/**
 * Below the Rate cards table: the blended day rates / target mix by product (its delta column feeds the blending adjustment), then the day-rate card.
 * Returns the mix table's first data row.
 */
export function writeRateBlocks(ws: XL.Worksheet, m: CostModel): number {
  const mixTitle = FIRST + m.rates.rows.length + 2, mixStart = mixTitle + 2;
  const end = writeBlock(ws, mixTitle, 'Blended day rates and target location mix by product (the engine prices the TO-BE team at the target day rate)', m.mix.heads, m.mix.rows);
  writeBlock(ws, end + 1, 'Rate card: day rate by location and grade band (EUR/day, as the engine reads it)', m.rateCard.heads, m.rateCard.rows);
  return mixStart;
}

export const paramsStart = (m: CostModel): number => FIRST + m.other.rows.length + 4;

/** Below the Other costs table: every parameter that moves the cost, with where it is edited in the app. The annual discount rate is the first row. */
export function writeParams(ws: XL.Worksheet, m: CostModel): number {
  const block: RateCardBlock = { heads: ['Scope', 'Product', 'Parameter', 'Value', 'Unit', 'Edited in (section)'], rows: m.params.map((p) => [p.scope, p.product, p.name, p.value, p.unit, p.where]) };
  writeBlock(ws, paramsStart(m) - 2, 'Parameters (if one changes, the cost changes)', block.heads, block.rows, [1, 3, 5, 6, 7, 8]);
  return paramsStart(m);
}
