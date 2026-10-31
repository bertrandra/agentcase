/** @calc-zone foundation */
import { scopeExists, scopeKey, type DisplayScope } from '@/domain/portfolio';
import { definePortfolioCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import { setActiveProduct, setEditScope } from './product';
import { dispatchChecked } from './portfolioGuard';

const same = (a: DisplayScope | undefined, b: DisplayScope): boolean => scopeKey(a ?? { kind: 'product' }) === scopeKey(b);

/** View state, not a document change: no undo step, never saved, never broadcast (like the edit scope). */
const scopeCmd = definePortfolioCommand<{ scope: DisplayScope }>({
  type: 'portfolio.setDisplayScope', label: () => 'Set display scope', undoable: false,
  apply: (pf, p) => (same(pf.displayScope, p.scope) ? pf : { ...pf, displayScope: p.scope }),
});

/**
 * The top bar's "Show" selector (display scope, F17): the active product (default, today's behaviour), the whole portfolio, one wave, or one unit
 * of the organisation tree at any level (F-B81, B10b). A wave or unit that does not exist is refused (false). Rule "Change follows Show": showing
 * the Portfolio, a Wave or a Unit sets the edit target back to All products
 * (`editScope` 'all'); the user may then pick one product in "Change". The product kind leaves the edit target alone (`showProduct` sets it).
 */
export function setDisplayScope(scope: DisplayScope): boolean {
  if (!scopeExists(appStore().getState().portfolio, scope)) return false;
  const changed = dispatchChecked(scopeCmd({ scope }));
  if (scope.kind !== 'product') setEditScope('all');
  return changed;
}

/**
 * Show one product: it becomes the active product, the scope goes back to "product" and, "Change follows Show", it is the edit target
 * (`editScope` 'product': its edits create overrides). False for an unknown product.
 */
export function showProduct(id: string): boolean {
  if (!appStore().getState().portfolio.products.some((p) => p.id === id)) return false;
  setActiveProduct(id);
  setDisplayScope({ kind: 'product' });
  setEditScope('product');
  return true;
}
