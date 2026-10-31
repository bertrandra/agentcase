/** @calc-zone product-resolution */
import { deliveryHistogram } from '../programme/histogramDelivery';
import { ctxOf } from './memo';
import { resolveProduct } from './resolve';
import type { ServiceView } from './serviceView';
import type { Portfolio } from './types';

/**
 * The load of a shared service against its capacity, month by month (docs/SPEC_BPMN.md § 21 F-B82, phase B10c), on the B9d resource histogram
 * (§ 19.8 F-B76): a product's human FTE of each month is READ from its Time Engine (`deliveryHistogram`, never recomputed) and the service carries
 * the part of it its activities weigh in the product's scope (its effort / the product's scope weight, the D-B38 basis). The products of the View
 * are laid on the portfolio calendar at their month 0 (a product outside the consolidation: its own months). The capacity is the FTE of the
 * service's lines; a month above it is flagged (D-B37: a diagnostic, no levelling).
 */
export interface ServiceLoadRow { productId: string; name: string; fte: number[] }
export interface ServiceLoad {
  /** calendar months `from`..`to`; index i = month `from + i` */
  from: number; to: number;
  rows: ServiceLoadRow[];
  total: number[];
  capacity: number;
  /** months whose total exceeds the capacity */
  flags: { month: number; fte: number }[];
}

/** `month0`: each product's month 0 on the portfolio calendar (the consolidation's; empty in a Product view: the product's own months). */
export function serviceLoad(pf: Portfolio, month0: ReadonlyMap<string, number>, s: ServiceView, productIds: readonly string[]): ServiceLoad {
  const each = s.products.filter((p) => productIds.includes(p.productId) && p.effort > 0).map((p) => {
    const h = deliveryHistogram(ctxOf(resolveProduct(pf, p.productId))), part = p.scopeEffort > 0 ? p.effort / p.scopeEffort : 0;
    return { p, m0: month0.get(p.productId) ?? 0, fte: h.humanFte.map((x) => x * part) };
  });
  if (!each.length) return { from: 1, to: 0, rows: [], total: [], capacity: s.capacity, flags: [] };
  const from = Math.min(...each.map((e) => e.m0 + 1)), to = Math.max(...each.map((e) => e.m0 + e.fte.length)), n = to - from + 1;
  const rows = each.map(({ p, m0, fte }): ServiceLoadRow => {
    const out = new Array<number>(n).fill(0);
    fte.forEach((x, t) => { out[m0 + 1 + t - from]! += x; });
    return { productId: p.productId, name: p.name, fte: out };
  });
  const total = Array.from({ length: n }, (_, i) => rows.reduce((a, r) => a + r.fte[i]!, 0));
  const flags = total.flatMap((x, i) => (x > s.capacity + 1e-9 ? [{ month: from + i, fte: x }] : []));
  return { from, to, rows, total, capacity: s.capacity, flags };
}

