/** @calc-zone exports */
import { makeCtx } from '@/domain';
import { evalDay } from '@/domain/model/evidenceTiers';
import { pfStressFingerprint } from '@/domain/portfolio';
import type { DisplayScope } from '@/domain/portfolio';
import { appVerFileTag } from '@/domain/snapshots';
import { activeDoc } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { pfSimStore } from '@/store/portfolioSimulation';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { shownLogo } from '@/domain/theme/logo';
import { buildResultsWorkbook, resultsData, type SheetImages } from '@/store/persistence/excel/results';
import { buildPortfolioResultsWorkbook } from '@/store/persistence/excel/results/portfolio';
import { hasPortfolioContent } from '@/store/persistence/portfolioSnapshot';
import { exportTheme } from './exportTheme';

export type { SheetImages } from '@/store/persistence/excel/results';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

import { planSheets } from '@/store/persistence/excel/results/plan';
import { currentPlanViews } from '@/store/planHooks';
/** "AgentCase_v<MAJOR>_<MINOR>_<kind>_2026-10-21-09-30-00.xlsx" (appVerFileTag): version tag and local-independent UTC stamp, like the legacy files. */
export function excelFilename(kind: string, now: Date = new Date()): string {
  return `AgentCase_${appVerFileTag()}_${kind}_${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
}

export interface ExcelFile { blob: Blob; filename: string }

/**
 * Build the results workbook (ROI, Investment, Operating costs, Savings, P&L, Workforce shift) of the current case.
 * `images` are optional chart pictures (base64 PNG) captured from mounted Chart.js canvases; sheets without one simply have no picture.
 *
 * A real portfolio (two products or waves, an override, a knowledge subset...) gets the portfolio workbook instead: "Portfolio", a sheet per wave,
 * "Knowledge transfer" and, per product, its summary and its own six results sheets. `scope` (default: the store's display scope) only picks the
 * group that leads; everything is exported. `plan` adds the 📅 Plan sheets (WBS, WBS dictionary, OBS, RAM, Histogram) of the display scope after
 * the results sheets (SPEC_FIXES FX-D15, optional; off = the workbook as before). Chart pictures are not embedded in a portfolio workbook (they
 * show one product's charts).
 */
export async function exportResultsWorkbook(
  images?: SheetImages, now: Date = new Date(), scope?: DisplayScope, opts: { plan?: boolean } = {},
): Promise<ExcelFile> {
  const xl = await loadExcelJS(), portfolio = appStore().getState().portfolio, doc = activeDoc(), print = exportTheme();
  if (hasPortfolioContent(portfolio)) {
    const run = pfSimStore.getState().run, stress = run ? { run, stale: run.fingerprint !== pfStressFingerprint(portfolio) } : null;
    const wb = buildPortfolioResultsWorkbook(xl, portfolio, print, scope ?? portfolio.displayScope ?? { kind: 'product' }, portfolio.activeProductId, stress);
    if (opts.plan) planSheets(wb, currentPlanViews());
    return { blob: new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME }), filename: excelFilename('Financial_Portfolio', now) };
  }
  const wb = buildResultsWorkbook(xl, resultsData(makeCtx(doc), undefined, evalDay(now)), print, images, shownLogo(doc)?.src);
  if (opts.plan) planSheets(wb, currentPlanViews());
  const buf = await wb.xlsx.writeBuffer();
  return { blob: new Blob([buf], { type: XLSX_MIME }), filename: excelFilename('Financial', now) };
}
