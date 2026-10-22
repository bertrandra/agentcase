import { consolidate, keptMonths, resolveProduct, runOf, scheduledProducts, type DisplayScope, type Portfolio } from '@/domain/portfolio';
import type { MonthRow } from '@/domain/time/rows';

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** The scopes every aggregate must serve: the Portfolio, then each wave that has planned products. */
export const scopesOf = (pf: Portfolio): DisplayScope[] => [{ kind: 'portfolio' }, ...pf.waves.filter((w) => consolidate(pf).waves.find((x) => x.id === w.id)?.productIds.length).map((w): DisplayScope => ({ kind: 'wave', id: w.id }))];

/** Planned products of a scope. */
export const idsOf = (pf: Portfolio, scope: DisplayScope): string[] =>
  scheduledProducts(pf).filter((s) => scope.kind !== 'wave' || s.wave.id === scope.id).map((s) => s.product.id);

/**
 * Independent derivation: a measure of the products' own Time Engine months (not the consolidation's series), placed at wave start + offset
 * (`month0`) and added up on the calendar axis. KT lead only moves part of the setup, so use it for run / savings / headcount measures.
 */
export function shifted(pf: Portfolio, ids: string[], pick: (r: MonthRow) => number): number[] {
  const horizon = consolidate(pf).horizon, out = new Array<number>(horizon).fill(0);
  for (const s of scheduledProducts(pf)) {
    if (!ids.includes(s.product.id)) continue;
    const rows = runOf(resolveProduct(pf, s.product.id)).rows;
    for (let t = 1; t <= keptMonths(horizon, s.month0, rows.length); t++) out[s.month0 + t - 1]! += pick(rows[t - 1]!);
  }
  return out;
}
