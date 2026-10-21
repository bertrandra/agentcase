import type { ExcelJS } from '../lazy';
import type { ResultsData, SheetImages } from './data';
import { investmentSheet, operatingSheet } from './costs';
import { roiSheet } from './roi';
import { plSheet, savingsSheet } from './savings';
import { workforceSheet } from './workforce';

export { resultsData, SETUP_LINES, type ResultsData, type SheetImages, type ImageKey } from './data';

/** The results workbook of the Financial tab: ROI, Investment, Operating costs, Savings, P&L, Workforce shift (legacy exportFinancialExcel). */
export function buildResultsWorkbook(xl: ExcelJS, data: ResultsData, images?: SheetImages) {
  const wb = new xl.Workbook();
  wb.creator = 'AgentCase';
  roiSheet(wb, data, images); investmentSheet(wb, data); operatingSheet(wb, data, images);
  savingsSheet(wb, data, images); plSheet(wb, data, images); workforceSheet(wb, data, images);
  return wb;
}
