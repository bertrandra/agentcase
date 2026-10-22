/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import { avg, yearSeries } from '@/domain/economics';
import type { ResultsData, SheetImages } from './data';
import { addImage, head, r0 } from './style';

/** Investment sheet: the one-time lines (all in Y1) and their total. */
export function investmentSheet(wb: Workbook, { v, setupLines }: ResultsData, name = 'Investment'): void {
  const ws = wb.addWorksheet(name), pad = v.years.slice(1).map(() => 0);
  ws.addRow(['Category', ...v.years.map((_, i) => `Y${i + 1}`), `Total ${v.H}y`]);
  for (const [label, x] of setupLines) ws.addRow([label, r0(x), ...pad, r0(x)]);
  ws.addRow(['Total one-time investment', r0(v.setup), ...pad, r0(v.setup)]);
  head(ws);
}

/** Operating costs sheet: four cost lines and their total by year, with the per-year average. */
export function operatingSheet(wb: Workbook, { v }: ResultsData, images?: SheetImages, name = 'Operating costs'): void {
  const ws = wb.addWorksheet(name), s = yearSeries(v.years);
  ws.addRow(['Category', ...v.years.map((_, i) => `Y${i + 1}`), `${v.H}y avg`]);
  const line = (label: string, a: number[]) => ws.addRow([label, ...a.map(r0), r0(avg(a))]);
  line('Human workforce (target team)', s.team); line('Agent execution (tokens)', s.token); line('Infrastructure & tools', s.infra);
  line('Agentic run team (AI premium)', s.agentRun); line('Total operating cost', s.run);
  head(ws); addImage(wb, ws, 'Operating costs', images);
}
