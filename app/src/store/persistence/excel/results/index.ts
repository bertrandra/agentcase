/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import type { ExcelJS } from '../lazy';
import { withPrint } from '../print';
import type { ThemeValues } from '@/domain/theme';
import type { ResultsData, SheetImages } from './data';
import { investmentSheet, operatingSheet } from './costs';
import { roiSheet } from './roi';
import { plSheet, savingsSheet } from './savings';
import { workforceSheet } from './workforce';
import { addLogo } from './logo';

export { resultsData, SETUP_LINES, type ResultsData, type SheetImages, type ImageKey } from './data';

/**
 * The results workbook of the Financial tab: ROI, Investment, Operating costs, Savings, P&L, Workforce shift (legacy exportFinancialExcel).
 * `print`: the base theme of the export (controllers/exportTheme.ts).
 * `logo`: the customer logo of a client presentation (a PNG / JPEG data URL), placed on the ROI sheet (docs/THEME.md §8.6).
 */
export function buildResultsWorkbook(xl: ExcelJS, data: ResultsData, print: Readonly<ThemeValues>, images?: SheetImages, logo?: string) {
  const wb = withPrint(new xl.Workbook(), print);
  wb.creator = 'AgentCase';
  addCaseSheets(wb, data, images);
  const roi = wb.getWorksheet('ROI');
  if (roi) addLogo(wb, roi, logo);
  return wb;
}

/** The six case sheets of a workbook; `name` maps the legacy sheet name to the one used (a portfolio prefixes them per product). */
export function addCaseSheets(wb: Workbook, data: ResultsData, images?: SheetImages, name: (base: string) => string = (b) => b): void {
  roiSheet(wb, data, images, name('ROI')); investmentSheet(wb, data, name('Investment')); operatingSheet(wb, data, images, name('Operating costs'));
  savingsSheet(wb, data, images, name('Savings')); plSheet(wb, data, images, name('P&L')); workforceSheet(wb, data, images, name('Workforce shift'));
}
export const CASE_SHEET_NAMES = ['ROI', 'Investment', 'Operating costs', 'Savings', 'P&L', 'Workforce shift'] as const;
