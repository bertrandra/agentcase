/** @calc-zone aggregate-views */
import type { Ctx } from '../ctx';
import type { CaseState } from '../types/state';
import { ctxOf } from './memo';
import { isOverridden } from './overrides';
import { resolveProduct } from './resolve';
import { scheduledProducts } from './timeline';
import type { Portfolio, Product } from './types';

/** The identity columns shared by every per-product line of an aggregate input view. */
export interface AggBase { id: string; name: string; wave: string; planned: boolean }
/** Smallest, largest and plain mean of a measure over the selection (null when the selection is empty). */
export interface Spread { min: number; max: number; mean: number }

/** One requested product with its effective case and engine context (unknown ids ignored, the order asked kept). */
export interface ProductCase extends AggBase { prod: Product; c: CaseState; ctx: Ctx; overridden: (ref: string) => boolean }

export function productCases(pf: Portfolio, ids: string[]): ProductCase[] {
  const planned = new Set(scheduledProducts(pf).map((s) => s.product.id)), out: ProductCase[] = [];
  for (const id of ids) {
    const prod = pf.products.find((p) => p.id === id);
    if (!prod) continue;
    const c = resolveProduct(pf, id);
    out.push({ id, name: prod.name, wave: pf.waves.find((w) => w.id === prod.waveId)?.name ?? '', planned: planned.has(id), prod, c, ctx: ctxOf(c), overridden: (r) => isOverridden(prod, r) });
  }
  return out;
}

export const base = (p: ProductCase): AggBase => ({ id: p.id, name: p.name, wave: p.wave, planned: p.planned });

export function spread(values: number[]): Spread | null {
  if (!values.length) return null;
  let min = Infinity, max = -Infinity, sum = 0;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; sum += v; }
  return { min, max, mean: sum / values.length };
}
