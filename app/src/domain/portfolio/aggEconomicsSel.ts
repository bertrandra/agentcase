/** @calc-zone aggregate-views */
import type { Consolidated } from './consolidate';
import type { Summary } from './headline';
import { scopeHeadline, type DisplayScope, type PortfolioHeadline } from './portfolioHeadline';
import { groupOf, type GroupScope } from './scopeGroup';
import type { Series } from './series';
import type { ProductView } from './waves';

/**
 * What the aggregate views of a Portfolio / Wave / Unit read: the planned products of the selection and their summed series, exactly the
 * consolidation's own objects (`groupOf`).
 */
export interface Sel { kind: GroupScope['kind']; label: string; waveId?: string; items: ProductView[]; series: Series; summary: Summary;
  headline: PortfolioHeadline }

/** The selection of a Portfolio / Wave / Unit View; null for a Product view or an unknown wave or unit. */
export function selectionOf(c: Consolidated, scope: DisplayScope): Sel | null {
  const sh = scopeHeadline(c, scope), g = scope.kind === 'product' ? null : groupOf(c, scope);
  if (!sh || !g) return null;
  return { kind: g.scope.kind, label: sh.label, waveId: scope.kind === 'wave' ? scope.id : undefined, items: g.items, series: g.series,
    summary: g.summary, headline: sh.headline };
}

/** Total of a monthly measure over a range of months. */
export const total = (a: number[]): number => a.reduce((x, y) => x + y, 0);
/** Sample at the end of each block of 12 calendar months (the last block may be partial): human FTE and vFTE are year-end figures. */
export function yearEnds(a: number[]): number[] {
  const out: number[] = [];
  for (let i = 12; i < a.length + 12; i += 12) out.push(a[Math.min(i, a.length) - 1] ?? 0);
  return out;
}
export const lastOf = (a: number[]): number => a[a.length - 1] ?? 0;
