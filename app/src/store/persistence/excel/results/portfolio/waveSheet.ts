import type { Workbook } from 'exceljs';
import { waveHeadline, type Consolidated, type ConsolidationView } from '@/domain/portfolio';
import { cardSheet, FMT_LINES, HDR_LINES, lineCells, MONEY, PCT, table } from './blocks';
import { headlineCards } from './portfolioSheet';

/**
 * Sheet "Wave <name>": the wave's headline cards, its products, and the cumulative cash by calendar month with the monthly flows. The series are
 * the wave's own aggregate in the consolidation (`Consolidated.waves`), the cards are `waveHeadline`.
 */
export function waveSheet(wb: Workbook, name: string, c: Consolidated, view: ConsolidationView, waveId: string): void {
  const w = c.waves.find((x) => x.id === waveId), h = waveHeadline(c, waveId);
  if (!w || !h) return;
  const ws = wb.addWorksheet(name), s = w.series, at = (a: number[], i: number): number => a[i] ?? 0;
  cardSheet(ws, [...headlineCards(h, c.horizon, `Wave: ${w.name}`), ['Start month (portfolio calendar)', w.startMonth]]);
  const mine = new Set(w.productIds);
  table(ws, 'Products of the wave', HDR_LINES, view.products.filter((p) => mine.has(p.id)).map(lineCells), FMT_LINES);
  table(ws, 'Cumulative cash by calendar month', ['Month', 'Calendar', 'Savings', 'Run cost', 'Setup', 'Net', 'Cumulative cash', 'Human FTE', 'Agent vFTE'],
    s.net.map((_, i) => [i + 1, view.chart.labels[i] ?? '', at(s.savings, i), at(s.run, i), at(s.setup, i), at(s.net, i), at(w.summary.cum, i), at(s.humanFte, i), at(s.agentVfte, i)]),
    [undefined, undefined, MONEY, MONEY, MONEY, MONEY, MONEY, PCT, PCT]);
  ws.getColumn(1).width = 46;
}
