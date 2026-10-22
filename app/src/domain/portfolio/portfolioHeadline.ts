import type { Consolidated } from './consolidate';
import { portfolioCostReduction, weightedVelocity, yearTable, type Summary } from './headline';

export interface PortfolioHeadline extends Summary {
  /** velocity uplift weighted by entry headcount */
  velocityPct: number;
  costReduction: ReturnType<typeof portfolioCostReduction>;
  /** calendar-year sums: savings, run cost, setup, net */
  years: Omit<ReturnType<typeof yearTable>, 'endYear'>;
  endYear: { savings: number; run: number; index: number };
}

/** The portfolio headline: the consolidated summary plus the figures the top bar and the results read, from the existing owners. */
export function portfolioHeadline(c: Consolidated): PortfolioHeadline {
  const { endYear, ...years } = yearTable(c.series), runs = c.products.map((v) => v.run);
  return { ...c.summary, velocityPct: weightedVelocity(runs), costReduction: portfolioCostReduction(runs), years, endYear };
}
