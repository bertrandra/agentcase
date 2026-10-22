/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import { sum, yearSeries } from '@/domain/economics';
import type { ResultsData, SheetImages } from './data';
import { addImage, f1, head, r0 } from './style';

/** Savings sheet: freed FTE, gross savings and the AS-IS baseline run per year. */
export function savingsSheet(wb: Workbook, { v }: ResultsData, images?: SheetImages, name = 'Savings'): void {
  const ws = wb.addWorksheet(name), s = yearSeries(v.years);
  ws.addRow(['Metric', ...v.years.map((_, i) => `Y${i + 1}`)]);
  ws.addRow(['Human FTE freed', ...v.freed.map(f1)]);
  ws.addRow(['Gross savings (vs AS-IS)', ...s.savings.map(r0)]);
  ws.addRow(['AS-IS baseline run', ...v.years.map(() => r0(v.baselineRun))]);
  head(ws); addImage(wb, ws, 'Savings', images);
}

/** P&L sheet: setup, baseline, to-be cost, savings, net and cumulative cash-flow (the legacy leaves the last cumulative cell empty). */
export function plSheet(wb: Workbook, { v }: ResultsData, images?: SheetImages, name = 'P&L'): void {
  const ws = wb.addWorksheet(name), s = yearSeries(v.years), setup = v.setup, pad = v.years.slice(1).map(() => 0);
  ws.addRow(['Line', ...v.years.map((_, i) => `Y${i + 1}`), 'Total']);
  ws.addRow(['Setup investment', -r0(setup), ...pad, -r0(setup)]);
  ws.addRow(['AS-IS baseline run', ...v.years.map(() => r0(v.baselineRun)), r0(v.baselineRun * v.H)]);
  ws.addRow(['TO-BE operating cost', ...s.run.map(r0), r0(sum(s.run))]);
  ws.addRow(['Gross savings', ...s.savings.map(r0), r0(v.totalBenefit)]);
  ws.addRow(['Net (savings - setup)', ...s.savings.map((x, i) => r0(x - (i === 0 ? setup : 0))), r0(v.totalBenefit - setup)]);
  ws.addRow(['Cumulative cash-flow', ...v.cumulative.map(r0), '']);
  head(ws); addImage(wb, ws, 'P&L', images);
}
