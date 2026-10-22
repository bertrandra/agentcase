/** @calc-zone exports */
import type * as ExcelJSNS from 'exceljs';

export type ExcelJS = typeof ExcelJSNS;

/** ExcelJS is loaded on demand (it is ~1 MB): importing/exporting a workbook is the only place that needs it. */
export async function loadExcelJS(): Promise<ExcelJS> {
  const m = (await import('exceljs')) as unknown as { default?: ExcelJS } & ExcelJS;
  return (m.default ?? m) as ExcelJS;
}
