/** @calc-zone exports */
import { corePortfolio, costModel, scopeSlug, type CostScope } from '@/domain/portfolio';
import { APP_VERSION } from '@/domain/version';
import { appStore } from '@/store/instance';
import { buildCostModelWorkbook } from '@/store/persistence/excel/costmodel';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { excelFilename, XLSX_MIME, type ExcelFile } from './excelResults';
import { exportTheme } from './exportTheme';

/**
 * The "Cost model (monthly)" workbook of the current portfolio for a scope (Portfolio, one wave or one product): Values (days), Rate cards, Other costs,
 * on the portfolio's monthly calendar with a t0 (AS-IS) column. Read-only: nothing is written to the document. A scope with no planned product is refused (the message is shown to the user).
 * File name: "AgentCase_v<version>_CostModel_<scope>_<UTC stamp>.xlsx".
 */
export async function exportCostModel(scope: CostScope, now: Date = new Date()): Promise<ExcelFile> {
  const model = costModel(corePortfolio(appStore().getState().portfolio), scope), xl = await loadExcelJS();
  const wb = buildCostModelWorkbook(xl, model, { version: APP_VERSION, generated: now }, exportTheme());
  return { blob: new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME }), filename: excelFilename(`CostModel_${scopeSlug(model.scopeLabel)}`, now) };
}
