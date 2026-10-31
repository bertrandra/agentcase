/** @calc-zone exports */
import type { Workbook, Worksheet } from 'exceljs';
import { groupOf, scopeHeadline, waveHeadline, type Consolidated, type ConsolidationView, type Series } from '@/domain/portfolio';
import { cardSheet, FMT_LINES, HDR_LINES, lineCells, MONEY, PCT, table } from './blocks';
import { headlineCards } from './portfolioSheet';

/** The products of a group and its cumulative cash by calendar month with the monthly flows (a wave's or a unit's sheet). */
function groupTables(ws: Worksheet, view: ConsolidationView, what: string, ids: Set<string>, s: Series, cum: number[]): void {
  const at = (a: number[], i: number): number => a[i] ?? 0;
  table(ws, `Products of the ${what}`, HDR_LINES, view.products.filter((p) => ids.has(p.id)).map(lineCells), FMT_LINES);
  table(ws, 'Cumulative cash by calendar month', ['Month', 'Calendar', 'Savings', 'Run cost', 'Setup', 'Net', 'Cumulative cash', 'Human FTE', 'Agent vFTE'],
    s.net.map((_, i) => [i + 1, view.chart.labels[i] ?? '', at(s.savings, i), at(s.run, i), at(s.setup, i), at(s.net, i), at(cum, i),
      at(s.humanFte, i), at(s.agentVfte, i)]),
    [undefined, undefined, MONEY, MONEY, MONEY, MONEY, MONEY, PCT, PCT]);
  ws.getColumn(1).width = 46;
}

/**
 * Sheet "Wave <name>": the wave's headline cards, its products, and the cumulative cash by calendar month with the monthly flows. The series are
 * the wave's own aggregate in the consolidation (`Consolidated.waves`), the cards are `waveHeadline`.
 */
export function waveSheet(wb: Workbook, name: string, c: Consolidated, view: ConsolidationView, waveId: string): void {
  const w = c.waves.find((x) => x.id === waveId), h = waveHeadline(c, waveId);
  if (!w || !h) return;
  const ws = wb.addWorksheet(name);
  cardSheet(ws, [...headlineCards(h, c.horizon, `Wave: ${w.name}`), ['Start month (portfolio calendar)', w.startMonth]]);
  groupTables(ws, view, 'wave', new Set(w.productIds), w.series, w.summary.cum);
}

/**
 * Sheet "Unit <name>" (B10d, written under a Unit scope only, where it leads the workbook): the unit's headline cards (`scopeHeadline`), its planned
 * products and its cumulative cash, read from the unit's selection (`groupOf`: its products' series added up, as a wave's).
 */
export function unitSheet(wb: Workbook, name: string, c: Consolidated, view: ConsolidationView, unitId: string): void {
  const scope = { kind: 'unit' as const, id: unitId }, g = groupOf(c, scope), h = scopeHeadline(c, scope)?.headline;
  if (!g || !h) return;
  const ws = wb.addWorksheet(name);
  cardSheet(ws, headlineCards(h, c.horizon, `Unit: ${g.label}`));
  groupTables(ws, view, 'unit', new Set(g.items.map((v) => v.id)), g.series, g.summary.cum);
}
