import { createContext, createElement, useContext, type ReactNode } from 'react';
import { corePortfolio, resolveProduct, type Portfolio } from '@/domain/portfolio';
import type { Doc, PortfolioDoc } from './types';

/**
 * The product a subtree READS (Vue agrégée). `null` (the default) = the active product, exactly as before. Inside a provider the read hooks
 * (`useDoc`, `useCtx`, `useCaseResult`, `useActiveProduct`, `useFieldState`, ...) answer for that product's resolved case, so ONE section component
 * can be rendered for any product without touching the store. Writes are not redirected: such a subtree must be read-only (`ui/widgets/ReadOnlyScope`).
 */
export const ProductViewContext = createContext<string | null>(null);

/** The product id the current subtree reads, or null for the active product. */
export const useViewProductId = (): string | null => useContext(ProductViewContext);

export function ProductViewProvider({ productId, children }: { productId: string; children: ReactNode }) {
  return createElement(ProductViewContext.Provider, { value: productId }, children);
}

const docs = new WeakMap<Portfolio, Map<string, Doc>>();
/**
 * The resolved case of a product as a `Doc` (the very object `resolveProduct` memoises, so `useCtx` / `caseResultOf` share their caches with the
 * consolidation). Stable until the product's inputs change; null for an unknown product.
 */
export function productDocOf(pf: PortfolioDoc, id: string): Doc | null {
  if (!pf.products.some((p) => p.id === id)) return null;
  const core = corePortfolio(pf);
  let m = docs.get(core);
  if (!m) { m = new Map(); docs.set(core, m); }
  let d = m.get(id);
  if (!d) { d = resolveProduct(core, id) as Doc; m.set(id, d); }
  return d;
}

/** The product a subtree shows: the enclosing `ProductViewContext`'s when it still exists, else the edited (active) product. */
export const shownProductId = (pf: PortfolioDoc, as: string | null): string => (as !== null && pf.products.some((p) => p.id === as) ? as : pf.activeProductId);
