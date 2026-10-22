import type { DisplayScope } from '@/domain/portfolio';
import { definePortfolioCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import { setActiveProduct } from './product';
import { dispatchChecked } from './portfolioGuard';

const idOf = (s: DisplayScope | undefined): string | undefined => (s?.kind === 'wave' ? s.id : undefined);
const same = (a: DisplayScope | undefined, b: DisplayScope): boolean => (a?.kind ?? 'product') === b.kind && idOf(a) === idOf(b);

/** View state, not a document change: no undo step, never saved, never broadcast (like the edit scope). */
const scopeCmd = definePortfolioCommand<{ scope: DisplayScope }>({
  type: 'portfolio.setDisplayScope', label: () => 'Set display scope', undoable: false,
  apply: (pf, p) => (same(pf.displayScope, p.scope) ? pf : { ...pf, displayScope: p.scope }),
});

/**
 * The top bar's "Vue" selector (display scope): the active product (default, today's behaviour), the whole portfolio, or one wave. A wave that does
 * not exist is refused (false).
 */
export function setDisplayScope(scope: DisplayScope): boolean {
  if (scope.kind === 'wave' && !appStore().getState().portfolio.waves.some((w) => w.id === scope.id)) return false;
  return dispatchChecked(scopeCmd({ scope }));
}

/** Show one product: it becomes the active product and the scope goes back to "product". False for an unknown product. */
export function showProduct(id: string): boolean {
  if (!appStore().getState().portfolio.products.some((p) => p.id === id)) return false;
  setActiveProduct(id);
  setDisplayScope({ kind: 'product' });
  return true;
}
