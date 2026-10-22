/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import { yearSeries } from '@/domain/economics';
import type { ResultsData, SheetImages } from './data';
import { addImage, f1, head, r0 } from './style';

/** Workforce shift sheet: human FTE and cost against agent vFTE and cost, year by year. */
export function workforceSheet(wb: Workbook, { v }: ResultsData, images?: SheetImages, name = 'Workforce shift'): void {
  const ws = wb.addWorksheet(name), s = yearSeries(v.years), at = (a: number[], i: number) => a[i] as number;
  ws.addRow(['Year', 'Human FTE', 'Human cost', 'Agent vFTE', 'Agent cost', 'Human + agent cost']);
  v.years.forEach((_, i) => ws.addRow([`Y${i + 1}`, f1(at(s.humanFte, i)), r0(at(s.team, i)), f1(at(s.agentVfte, i)), r0(at(s.token, i)), r0(at(s.team, i) + at(s.token, i))]));
  head(ws); addImage(wb, ws, 'Workforce shift', images);
}
