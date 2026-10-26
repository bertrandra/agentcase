/** @calc-zone economics-headline @owner fte-before-after */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import type { MonthRow } from '../time/rows';
import type { YearRow } from '../time/years';

/**
 * Total human FTE before (AS-IS entry team) and after (a year end, by default the horizon end: delivery team plus the agentic run team), the FTE
 * freed (never negative) and the reduction in percent of the entry team (negative when the team grows). The one definition every screen, export,
 * registry variable and the portfolio headline read.
 */
export interface FteBeforeAfter { before: number; after: number; freed: number; reductionPct: number }

export const fteBeforeAfter = (before: number, after: number): FteBeforeAfter =>
  ({ before, after, freed: Math.max(0, before - after), reductionPct: before > 0 ? (1 - after / before) * 100 : 0 });

/** Human FTE of an engine year end: delivery team + agentic run team (`totalHumanFteEnd`). */
export const humanFteOfYear = (y: Pick<YearRow, 'totalHumanFteEnd'>): number => y.totalHumanFteEnd;
/** Human FTE of an engine month: delivery team + agentic run team. */
export const humanFteOfMonth = (r: Pick<MonthRow, 'humanFte' | 'runTeamFte'>): number => r.humanFte + (r.runTeamFte || 0);

/** FTE before / after at the end of every horizon year of the live case. */
export function fteByYear(c: Ctx): FteBeforeAfter[] {
  const eng = engineNow(c);
  return eng.years().map((y) => fteBeforeAfter(eng.K.baseEtp, humanFteOfYear(y)));
}

/** FTE before / after at the end of year `year` (default: the horizon end) of the live case. */
export function caseFte(c: Ctx, year?: number): FteBeforeAfter {
  const eng = engineNow(c), ys = eng.years(), y = ys[Math.min(ys.length, Math.max(1, year ?? ys.length)) - 1];
  return fteBeforeAfter(eng.K.baseEtp, y ? humanFteOfYear(y) : eng.K.baseEtp);
}

/** FTE before / after at the end of month `t` (1-based, clamped to the horizon) of the live case. */
export function fteAtMonth(c: Ctx, t: number): FteBeforeAfter {
  const eng = engineNow(c);
  return fteBeforeAfter(eng.K.baseEtp, humanFteOfMonth(eng.monthAt(Math.min(eng.horizonMonths, Math.max(1, Math.round(t))))));
}
