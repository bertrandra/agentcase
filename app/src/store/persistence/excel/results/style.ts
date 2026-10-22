/** @calc-zone exports */
import type { Workbook, Worksheet } from 'exceljs';
import type { ImageKey, SheetImages } from './data';

/** Legacy rounding of every money figure. */
export const r0 = (x: number): number => Math.round(x);
/** The legacy "+v.toFixed(1)" used for FTE counts. */
export const f1 = (x: number): number => +x.toFixed(1);

/** Navy bold-white header row, 22-wide columns (legacy head()). */
export function head(ws: Worksheet): void {
  ws.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2761' } };
    c.alignment = { horizontal: 'left' };
  });
  ws.columns.forEach((col) => { col.width = 22; });
}

/** Chart picture position/size per sheet (legacy addImg arguments: column, row, width, height). */
const IMG: Record<ImageKey, [number, number, number, number]> = {
  ROI: [5, 1, 470, 230], 'Operating costs': [6, 1, 320, 300], Savings: [5, 1, 430, 210], 'P&L': [6, 1, 470, 230], 'Workforce shift': [7, 1, 470, 240],
};

/** Embed the chart picture of a sheet when one was captured; a missing or broken picture never fails the export. */
export function addImage(wb: Workbook, ws: Worksheet, key: ImageKey, images: SheetImages | undefined): void {
  const b64 = images?.[key];
  // only a well-formed PNG is embedded: a corrupt picture would otherwise fail the whole workbook when it is written
  if (!b64 || b64.length % 4 !== 0 || !/^iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(b64)) return;
  try {
    const [col, row, width, height] = IMG[key];
    ws.addImage(wb.addImage({ base64: b64, extension: 'png' }), { tl: { col, row }, ext: { width, height } });
  } catch { /* the legacy ignores a canvas it cannot read */ }
}
