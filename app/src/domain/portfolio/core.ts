/** @calc-zone product-resolution */
import { memoChain } from './memo';
import type { Portfolio } from './types';

const roots = new WeakMap<object, unknown>();

/**
 * The part of a portfolio that the figures depend on (common values with the teams of its document, products, waves, hub, horizon, start date,
 * setup capacity), as a
 * portfolio whose
 * identity changes only when one of those does. View state (active product, edit and display scope) is left out: switching the product or
 * the scope never recomputes the consolidation, the Knowledge transfer view or the products table (they memoise on this identity).
 * `activeProductId` is the first product, only to keep the object a valid portfolio.
 */
export function corePortfolio(pf: Portfolio): Portfolio {
  const cap = pf.maxConcurrentSetups;
  return memoChain(roots, [pf.common, pf.products, pf.waves, pf.hub], `${pf.horizonMonths}|${pf.startDate}|${cap ?? ''}`, () => ({
    _schema: pf._schema, common: pf.common, products: pf.products, waves: pf.waves, hub: pf.hub, horizonMonths: pf.horizonMonths, startDate: pf.startDate,
    activeProductId: (pf.products[0] as { id: string }).id, ...(cap === undefined ? {} : { maxConcurrentSetups: cap }),
  }));
}
