import { makeCtx } from '@/domain';
import { pfStressFingerprint } from '@/domain/portfolio';
import type { DisplayScope } from '@/domain/portfolio';
import { APP_VERSION } from '@/domain/version';
import { appStore } from '@/store/instance';
import { pfSimStore } from '@/store/portfolioSimulation';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { buildResultsWorkbook, resultsData, type SheetImages } from '@/store/persistence/excel/results';
import { buildPortfolioResultsWorkbook } from '@/store/persistence/excel/results/portfolio';
import { hasPortfolioContent } from '@/store/persistence/portfolioSnapshot';

export type { SheetImages } from '@/store/persistence/excel/results';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** "AgentCase_v20_1_<kind>_2026-10-21-09-30-00.xlsx": version tag and local-independent UTC stamp, like the legacy files. */
export function excelFilename(kind: string, now: Date = new Date()): string {
  const ver = `v${APP_VERSION.replace(/\.0+$/, '').replace(/\./g, '_')}_`;
  return `AgentCase_${ver}${kind}_${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
}

export interface ExcelFile { blob: Blob; filename: string }

/**
 * Build the results workbook (ROI, Investment, Operating costs, Savings, P&L, Workforce shift) of the current case.
 * `images` are optional chart pictures (base64 PNG) captured from mounted Chart.js canvases; sheets without one simply have no picture.
 *
 * A real portfolio (two products or waves, an override, a knowledge subset...) gets the portfolio workbook instead: "Portfolio", a sheet per wave,
 * "Knowledge transfer" and, per product, its summary and its own six results sheets. `scope` (default: the store's display scope) only picks the
 * group that leads; everything is exported. Chart pictures are not embedded in a portfolio workbook (they show one product's charts).
 */
export async function exportResultsWorkbook(images?: SheetImages, now: Date = new Date(), scope?: DisplayScope): Promise<ExcelFile> {
  const xl = await loadExcelJS(), { doc, portfolio } = appStore().getState();
  if (hasPortfolioContent(portfolio)) {
    const run = pfSimStore.getState().run, stress = run ? { run, stale: run.fingerprint !== pfStressFingerprint(portfolio) } : null;
    const wb = buildPortfolioResultsWorkbook(xl, portfolio, scope ?? portfolio.displayScope ?? { kind: 'product' }, portfolio.activeProductId, stress);
    return { blob: new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME }), filename: excelFilename('Financial_Portfolio', now) };
  }
  const wb = buildResultsWorkbook(xl, resultsData(makeCtx(doc)), images);
  const buf = await wb.xlsx.writeBuffer();
  return { blob: new Blob([buf], { type: XLSX_MIME }), filename: excelFilename('Financial', now) };
}
