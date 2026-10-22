import { fteBeforeAfter, type FteBeforeAfter } from '../economics/fte';
import type { Consolidated } from './consolidate';
import { portfolioCostReduction, weightedAutomation, weightedVelocity, yearTable, type Summary } from './headline';
import type { Series } from './series';
import type { ProductView } from './waves';

export interface PortfolioHeadline extends Summary {
  /** velocity uplift weighted by entry headcount */
  velocityPct: number;
  /** effective automation % and glass ceiling %, weighted by entry headcount */
  eff: number;
  ceiling: number;
  costReduction: ReturnType<typeof portfolioCostReduction>;
  /** total human FTE before / after (horizon end), summed over the planned products */
  fte: FteBeforeAfter;
  /** calendar-year sums: savings, run cost, setup, net */
  years: Omit<ReturnType<typeof yearTable>, 'endYear'>;
  endYear: { savings: number; run: number; index: number };
  /** planned products behind the figures */
  products: number;
}

/** The figures of any group of planned products (portfolio, wave): its consolidated summary plus what the top bar and the results read, from the existing owners. */
function groupHeadline(items: ProductView[], series: Series, summary: Summary): PortfolioHeadline {
  const { endYear, ...years } = yearTable(series), runs = items.map((v) => v.run), auto = weightedAutomation(runs);
  const after = runs.reduce((a, r) => a + (r.engine.years().at(-1)?.totalHumanFteEnd ?? 0), 0), before = runs.reduce((a, r) => a + r.baseEtp, 0);
  return { ...summary, velocityPct: weightedVelocity(runs), ...auto, costReduction: portfolioCostReduction(runs), fte: fteBeforeAfter(before, after), years, endYear, products: items.length };
}

const memo = new WeakMap<object, PortfolioHeadline>();
function memoised(key: object, build: () => PortfolioHeadline): PortfolioHeadline {
  let h = memo.get(key);
  if (!h) { h = build(); memo.set(key, h); }
  return h;
}

/** The portfolio headline (all planned products). Memoised on the consolidation. */
export const portfolioHeadline = (c: Consolidated): PortfolioHeadline => memoised(c, () => groupHeadline(c.products, c.series, c.summary));

/** The same figures for one wave; null for an unknown wave. */
export function waveHeadline(c: Consolidated, waveId: string): PortfolioHeadline | null {
  const w = c.waves.find((x) => x.id === waveId);
  return w ? memoised(w, () => groupHeadline(c.products.filter((v) => v.waveId === w.id), w.series, w.summary)) : null;
}

/** What the top bar shows: the active product (today's behaviour), the whole portfolio, or one wave (the single owners above). */
export type DisplayScope = { kind: 'product' } | { kind: 'portfolio' } | { kind: 'wave'; id: string };

/** Figures and label of a display scope other than the active product; null for the product scope or a wave that no longer exists. */
export function scopeHeadline(c: Consolidated, scope: DisplayScope): { label: string; headline: PortfolioHeadline } | null {
  if (scope.kind === 'portfolio') return { label: 'Portfolio', headline: portfolioHeadline(c) };
  if (scope.kind !== 'wave') return null;
  const h = waveHeadline(c, scope.id), w = c.waves.find((x) => x.id === scope.id);
  return h && w ? { label: w.name, headline: h } : null;
}
