/** @calc-zone exports */
import { makeCtx } from '@/domain';
import { evalDay } from '@/domain/model/evidenceTiers';
import { mspdiXml } from '@/domain/programme/mspdi';
import type { PlanViews } from '@/domain/programme/planBundle';
import { shownLogo } from '@/domain/theme/logo';
import { activeDoc } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { buildResultsWorkbook, resultsData } from '@/store/persistence/excel/results';
import { planSheets } from '@/store/persistence/excel/results/plan';
import { buildPortfolioResultsWorkbook } from '@/store/persistence/excel/results/portfolio';
import { hasPortfolioContent } from '@/store/persistence/portfolioSnapshot';
import { renderPlanReport } from '@/store/persistence/report/plan';
import { excelFilename, XLSX_MIME, type ExcelFile } from './excelResults';
import { exportTheme } from './exportTheme';

/**
 * The exports of the 📅 Plan screen (docs/SPEC_BPMN.md § 19.8 F-B77; phase B9d), all from the plan views the screen shows (one source):
 * the MS Project XML file (MSPDI, export only, D-B36), the results workbook with the WBS, WBS dictionary, OBS, RAM and Histogram sheets after
 * the case (or portfolio) sheets, and the plan report (Gantt, WBS and histogram pages). The Financial tab's workbook and the Critical &
 * Regulated report are unchanged (their legacy form).
 */
const stamp = (now: Date): string => now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
const title = (v: PlanViews): string => (v.scope.kind === 'product' ? v.plan.products[0]?.name ?? 'Product' : v.scope.kind === 'wave'
  ? `Wave ${v.plan.products[0]?.wave?.name ?? ''}`.trim() : v.scope.kind === 'unit' ? `Unit ${v.scope.name}` : 'Portfolio');

export function exportMspdi(v: PlanViews, now: Date = new Date()): { filename: string; text: string } {
  return { filename: `AgentCase_Programme_MSProject_${stamp(now)}.xml`, text: mspdiXml(v.plan, v.wbs, v.dictionary, title(v)) };
}

export async function exportPlanWorkbook(v: PlanViews, now: Date = new Date()): Promise<ExcelFile> {
  const xl = await loadExcelJS(), portfolio = appStore().getState().portfolio, doc = activeDoc(), print = exportTheme();
  const wb = hasPortfolioContent(portfolio)
    ? buildPortfolioResultsWorkbook(xl, portfolio, print, portfolio.displayScope ?? { kind: 'product' }, portfolio.activeProductId, null)
    : buildResultsWorkbook(xl, resultsData(makeCtx(doc), undefined, evalDay(now)), print, undefined, shownLogo(doc)?.src);
  planSheets(wb, v);
  return { blob: new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME }), filename: excelFilename('Financial_Plan', now) };
}

export function exportPlanReport(v: PlanViews, now: Date = new Date()): { filename: string; text: string } {
  return { filename: `AgentCase_Programme_Plan_${stamp(now)}.html`, text: renderPlanReport(v, exportTheme(), title(v), now.toISOString().slice(0, 10)) };
}
