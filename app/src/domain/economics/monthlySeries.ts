import type { Engine } from '../time';

/** One month of the trajectory in the legacy `monthlySeries()` row shape. */
export interface MonthlyRow {
  mo: number; ramp: number; humanETP: number; agentVfte: number; teamCost: number; tokenCost: number;
  /** setup spend of the month */
  setupSpend: number;
  /** run cost (incl. Knowledge Hub) + setup */
  total: number;
  /** gross saving of the month */
  sav: number;
  /** cumulative cash-flow (net of setup) up to and including the month */
  cum: number;
}

/** Thin read layer over the Time Engine (legacy monthlySeries()): one row per month of the horizon. */
export function monthlySeries(eng: Engine): MonthlyRow[] {
  return eng.months().map((r) => ({
    mo: r.monthIndex, ramp: r.adoptionRampPct, humanETP: r.humanFte, agentVfte: r.agentVfte, teamCost: r.teamCost, tokenCost: r.tokenCost,
    setupSpend: r.setupCost, total: r.total, sav: r.grossSavings, cum: eng.cumulativeAt(r.monthIndex),
  }));
}

/** Every `step`-th row (chart decimation: the legacy charts keep every 2nd/3rd point once the series is long). */
export const decimate = <T>(rows: T[], step: number): T[] => rows.filter((_, i) => i % step === 0);
