/** @calc-zone exports */
import { consolidate, type Consolidated } from './consolidate';
import { calendarOf } from './calendar';
import { keptMonths } from './timeline';
import type { CostScope } from './costModelTypes';
import type { Portfolio } from './types';
import type { ProductView, WaveView } from './waves';

/** The planned products an export covers, in portfolio order, with the consolidation they come from. */
export interface Picked { c: Consolidated; views: ProductView[]; waves: WaveView[]; label: string; excluded: string[] }

/** Select the scope's products among the planned ones (archived and wave-less products are never planned). A product or wave that is not planned is an error. */
export function pickScope(pf: Portfolio, scope: CostScope): Picked {
  const c = consolidate(pf), name = (id: string) => pf.products.find((p) => p.id === id)?.name ?? id;
  const excluded = c.excluded.map(name);
  if (scope.kind === 'portfolio' && !c.products.length) throw new Error('No product is planned (give each product a wave): nothing to export.');
  if (scope.kind === 'portfolio') return { c, views: c.products, waves: c.waves.filter((w) => w.productIds.length), label: 'Portfolio', excluded };
  if (scope.kind === 'wave') {
    const w = c.waves.find((x) => x.id === scope.id);
    if (!w) throw new Error('This wave does not exist.');
    if (!w.productIds.length) throw new Error(`Wave ${w.name} has no planned product: nothing to export.`);
    return { c, views: c.products.filter((v) => v.waveId === w.id), waves: [w], label: `Wave ${w.name}`, excluded };
  }
  const v = c.products.find((x) => x.id === scope.id);
  if (!v) throw new Error(`Product ${name(scope.id)} is not planned (no wave, or archived): nothing to export.`);
  return { c, views: [v], waves: c.waves.filter((w) => w.id === v.waveId), label: `Product ${v.name}`, excluded: [] };
}

/** "M1", "M2"..., with the calendar date of the month when the portfolio has a start date. */
export function monthLabels(pf: Portfolio, n: number): string[] {
  const cal = calendarOf(pf);
  return Array.from({ length: n }, (_, i) => (pf.startDate ? `M${i + 1} (${cal.dateAt(i)})` : `M${i + 1}`));
}

/** The product's own month t (1..) on the calendar axis: index month0 + t - 1. Cells outside the product's months stay empty (null). */
export function lay(v: ProductView, L: number, f: (t: number) => number): (number | null)[] {
  const out: (number | null)[] = new Array<number | null>(L).fill(null), kept = keptMonths(L, v.month0, v.run.rows.length);
  for (let t = 1; t <= kept; t++) out[v.month0 + t - 1] = f(t);
  return out;
}

/** Same window, from a calendar series (index = calendar month - 1), with the KT preparation months before the product starts included. */
export function layWide(v: ProductView, L: number, f: (i: number) => number): (number | null)[] {
  const out: (number | null)[] = new Array<number | null>(L).fill(null), end = v.month0 + keptMonths(L, v.month0, v.run.rows.length);
  for (let i = Math.max(0, v.series.first - 1); i < end; i++) out[i] = f(i);
  return out;
}

export const sumOf = (a: (number | null)[]): number | null => (a.some((x) => x !== null) ? a.reduce<number>((s, x) => s + (x ?? 0), 0) : null);
