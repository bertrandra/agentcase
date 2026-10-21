import { makeCtx } from '@/domain';
import { APP_VERSION } from '@/domain/version';
import { appStore } from '@/store/instance';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { buildResultsWorkbook, resultsData, type SheetImages } from '@/store/persistence/excel/results';

export type { SheetImages } from '@/store/persistence/excel/results';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** "AgentCase_v19_0_0-dev_<kind>_2026-10-21-09-30-00.xlsx": version tag and local-independent UTC stamp, like the legacy files. */
export function excelFilename(kind: string, now: Date = new Date()): string {
  const ver = `v${APP_VERSION.replace(/\.0+$/, '').replace(/\./g, '_')}_`;
  return `AgentCase_${ver}${kind}_${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
}

export interface ExcelFile { blob: Blob; filename: string }

/**
 * Build the results workbook (ROI, Investment, Operating costs, Savings, P&L, Workforce shift) of the current case.
 * `images` are optional chart pictures (base64 PNG) captured from mounted Chart.js canvases; sheets without one simply have no picture.
 */
export async function exportResultsWorkbook(images?: SheetImages, now: Date = new Date()): Promise<ExcelFile> {
  const xl = await loadExcelJS(), wb = buildResultsWorkbook(xl, resultsData(makeCtx(appStore().getState().doc)), images);
  const buf = await wb.xlsx.writeBuffer();
  return { blob: new Blob([buf], { type: XLSX_MIME }), filename: excelFilename('Financial', now) };
}
