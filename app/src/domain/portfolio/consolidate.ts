/** @calc-zone portfolio-consolidation */
import { caseDiscountRate } from '../canonical';
import { runOf } from './run';
import { ctxOf } from './memo';
import { resolveProduct } from './resolve';
import { processCommon } from './teamAccess';
import { productSeries, type Series } from './series';
import { scheduledProducts, unscheduledIds } from './timeline';
import type { Summary } from './headline';
import type { CommonCase, Portfolio } from './types';
import { aggregate, productView, waveViews, type ProductView, type WaveView } from './waves';

/** The portfolio on the calendar axis: every figure is the sum of the products' own Time Engine months, shifted. */
export interface Consolidated {
  /** calendar months (series length) */
  horizon: number;
  /** the common annual discount rate, never overridden */
  rate: number;
  products: ProductView[];
  waves: WaveView[];
  /** ids left out: archived, or without a (known) wave */
  excluded: string[];
  series: Series;
  summary: Summary;
  /** sum of the entry headcounts of the planned products */
  baseEtp: number;
  /** adoption %, weighted by base ETP; products not yet started count as 0 */
  adoptionPct: number[];
}

const rates = new WeakMap<CommonCase, number>();
/** The common discount rate, read by the case owner `caseDiscountRate` on the common values. */
function commonRate(common: CommonCase): number {
  let r = rates.get(common);
  if (r === undefined) { r = caseDiscountRate(ctxOf({ ...common, teamIn: [] })); rates.set(common, r); }
  return r;
}

const memo = new WeakMap<Portfolio, Consolidated>(), sources = new WeakMap<Consolidated, Portfolio>();

/** The portfolio a consolidation was built from (the selections of `scopeGroup.ts` read its waves and units); undefined for a foreign object. */
export const sourceOf = (c: Consolidated): Portfolio | undefined => sources.get(c);

export function consolidate(pf: Portfolio): Consolidated {
  const hit = memo.get(pf);
  if (hit) return hit;
  const horizon = Math.max(0, Math.floor(pf.horizonMonths) || 0), rate = commonRate(processCommon(pf.common));
  const products = scheduledProducts(pf).map((s) => {
    const run = runOf(resolveProduct(pf, s.product.id));
    return productView(s, run, productSeries(run, s, horizon), rate);
  });
  const { series, summary } = aggregate(products, horizon, rate);
  const baseEtp = products.reduce((a, v) => a + v.run.baseEtp, 0);
  const adoptionPct = series.adoptionW.map((w) => (baseEtp > 0 ? w / baseEtp : 0));
  const out: Consolidated = { horizon, rate, products, waves: waveViews(pf, products, horizon, rate), excluded: unscheduledIds(pf), series, summary, baseEtp,
    adoptionPct };
  memo.set(pf, out); sources.set(out, pf);
  return out;
}
