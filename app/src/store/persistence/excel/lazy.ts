/** @calc-zone exports */
import type * as ExcelJSNS from 'exceljs';
import { excelSource } from './excelSource';

export type ExcelJS = typeof ExcelJSNS;

/**
 * ExcelJS is loaded on demand (it is ~1 MB): importing/exporting a workbook is the only place that needs it. In the built single file it is stored
 * gzip-compressed and decompressed on the first use (`excelSource.ts`, `excelInline.ts`); nothing of it runs at boot.
 */
export async function loadExcelJS(): Promise<ExcelJS> {
  const m = (await excelSource()) as { default?: ExcelJS } & ExcelJS;
  return (m.default ?? m) as ExcelJS;
}
