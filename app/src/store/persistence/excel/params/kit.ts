/** @calc-zone exports */
import type * as XL from 'exceljs';
import { argb } from '@/domain/theme';

/** Cell styling and data validation of the legacy workbook (navy header, blue = editable input, grey = reference). */
const NAVY = (): string => argb('excel-head-bg');
const T = { style: 'thin' as const, color: { get argb() { return argb('excel-border'); } } };
const BD = { top: T, left: T, bottom: T, right: T };

export const head = (ws: XL.Worksheet): void => {
  ws.getRow(1).eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY() } };
    c.font = { bold: true, color: { argb: argb('excel-head-text') }, size: 11 };
    c.alignment = { horizontal: 'center' }; c.border = BD;
  });
};
export const blue = (c: XL.Cell): void => { c.font = { color: { argb: argb('excel-input') }, size: 11 }; c.alignment = { horizontal: 'center' }; c.border = BD; };
export const grey = (c: XL.Cell): void => { c.font = { color: { argb: argb('excel-note') }, size: 11 }; c.alignment = { horizontal: 'center' }; };
export const note = (c: XL.Cell): void => { c.font = { color: { argb: argb('excel-note') }, size: 11 }; };
export const frz = (ws: XL.Worksheet): void => { ws.views = [{ state: 'frozen', ySplit: 1 }]; };

const base = { allowBlank: true, showErrorMessage: true, errorStyle: 'error', showInputMessage: true } as const;
export const listDV = (vals: (string | number)[], prompt: string): XL.DataValidation =>
  ({ ...base, type: 'list', formulae: [`"${vals.join(',')}"`], errorTitle: 'Invalid', error: 'Pick a value from the list.', promptTitle: 'Choose', prompt }) as XL.DataValidation;
export const rangeDV = (mn: number, mx: number, whole: boolean, prompt: string): XL.DataValidation =>
  ({ ...base, type: whole ? 'whole' : 'decimal', operator: 'between', formulae: [mn, mx], errorTitle: 'Out of range', error: `Value must be between ${mn} and ${mx}.`, promptTitle: 'Allowed range', prompt }) as XL.DataValidation;
export const geDV = (mn: number, prompt: string): XL.DataValidation =>
  ({ ...base, type: 'decimal', operator: 'greaterThanOrEqual', formulae: [mn], errorTitle: 'Invalid', error: `Value must be ≥ ${mn}.`, promptTitle: 'Minimum', prompt }) as XL.DataValidation;
export const ynDV = (): XL.DataValidation => listDV(['Yes', 'No'], 'Yes or No');

/** A worksheet with its header row and column widths. */
export function sheet(wb: XL.Workbook, name: string, cols: [string, number][]): XL.Worksheet {
  const ws = wb.addWorksheet(name);
  ws.columns = cols.map(([header, width]) => ({ header, width }));
  return ws;
}
/** Style a row's cells: `kinds[i]` = 'b' blue input, 'g' grey reference, 'n' note, '' untouched. */
export function style(row: XL.Row, kinds: string): void {
  [...kinds].forEach((k, i) => { const c = row.getCell(i + 1); if (k === 'b') blue(c); else if (k === 'g') grey(c); else if (k === 'n') note(c); });
}
