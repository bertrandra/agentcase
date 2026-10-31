/** @calc-zone portfolio-consolidation @owner portfolio-headline */
import { fteBeforeAfter, type FteBeforeAfter } from '../economics/fte';
import type { Consolidated } from './consolidate';
import { portfolioCostReduction, productFteAfter, weightedAutomation, weightedVelocity, yearTable, type Summary } from './headline';
import type { Series } from './series';
import { groupOf, type GroupScope } from './scopeGroup';
import type { ProductView } from './waves';

export interface PortfolioHeadline extends Summary {
  /** velocity uplift weighted by entry headcount */
  velocityPct: number;
  /** effective automation % and glass ceiling %, weighted by entry headcount */
  eff: number;
  ceiling: number;
  costReduction: ReturnType<typeof portfolioCostReduction>;
  /** total human FTE before (entry teams) / after (portfolio horizon end, from the series: `productFteAfter`), summed over the planned products */
  fte: FteBeforeAfter;
  /** calendar-year sums: savings, run cost, setup, net */
  years: Omit<ReturnType<typeof yearTable>, 'endYear'>;
  endYear: { savings: number; run: number; index: number };
  /** planned products behind the figures */
  products: number;
}

/**
 * The figures of any group of planned products (portfolio, wave, unit): its consolidated summary plus what the top bar and the results read, from the
 * existing owners.
 */
function groupHeadline(items: ProductView[], series: Series, summary: Summary): PortfolioHeadline {
  const { endYear, ...years } = yearTable(series), runs = items.map((v) => v.run), auto = weightedAutomation(runs);
  // after: read from the calendar series at the portfolio horizon end (one human-FTE definition: delivery team plus run team), not each engine's own end
  const after = items.reduce((a, v) => a + productFteAfter(v), 0), before = runs.reduce((a, r) => a + r.baseEtp, 0);
  return { ...summary, velocityPct: weightedVelocity(runs), ...auto, costReduction: portfolioCostReduction(items, series.net.length),
    fte: fteBeforeAfter(before, after), years,
    endYear, products: items.length };
}

const memo = new WeakMap<object, PortfolioHeadline>();
function memoised(key: object, build: () => PortfolioHeadline): PortfolioHeadline {
  let h = memo.get(key);
  if (!h) { h = build(); memo.set(key, h); }
  return h;
}

/** The portfolio headline (all planned products). Memoised on the consolidation. */
export const portfolioHeadline = (c: Consolidated): PortfolioHeadline => memoised(c, () => groupHeadline(c.products, c.series, c.summary));

/** What the top bar shows: the active product (today's behaviour), the whole portfolio, one wave or one unit (`scopeGroup.ts`, F-B81). */
export type DisplayScope = { kind: 'product' } | GroupScope;

/**
 * Figures and label of a display scope other than the active product (the single owners above, on the selection of `groupOf`); null for the
 * product scope or a wave / unit that no longer exists. Memoised on the selection.
 */
export function scopeHeadline(c: Consolidated, scope: DisplayScope): { label: string; headline: PortfolioHeadline } | null {
  if (scope.kind === 'product') return null;
  if (scope.kind === 'portfolio') return { label: 'Portfolio', headline: portfolioHeadline(c) };
  const g = groupOf(c, scope);
  return g ? { label: g.label, headline: memoised(g, () => groupHeadline(g.items, g.series, g.summary)) } : null;
}

/** The same figures for one wave; null for an unknown wave. */
export const waveHeadline = (c: Consolidated, waveId: string): PortfolioHeadline | null => scopeHeadline(c, { kind: 'wave', id: waveId })?.headline ?? null;
