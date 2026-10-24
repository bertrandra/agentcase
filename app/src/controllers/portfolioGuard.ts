/** @calc-zone product-resolution */
import { validate } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { runCommands } from '@/store/portfolioState';
import type { Command } from '@/store/types';

/**
 * Dispatch a portfolio command only if the portfolio it produces still satisfies the invariants of spec 4.1 (one wave per product, weights
 * adding up to 100, at least one product, an existing active product, ...). Returns false, and changes nothing, when it would not.
 */
export function dispatchChecked(cmd: Command): boolean {
  const [next, patches] = runCommands(appStore().getState().portfolio, [cmd]);
  if (!patches.length) return false;
  if (validate(next).errors.length) return false;
  appStore().dispatch(cmd);
  return true;
}

/** A short unique id from the safe alphabet [a-z0-9] (spec 8: ids are strings from a safe list), not used by `taken`. */
export function newId(prefix: string, taken: string[]): string {
  for (;;) {
    const id = prefix + Math.random().toString(36).slice(2, 8);
    if (!taken.includes(id)) return id;
  }
}

/** A new product or wave id (`p…` / `w…`), unique among the products and the waves of the portfolio. */
export function newPortfolioId(prefix: string): string {
  const pf = appStore().getState().portfolio;
  return newId(prefix, [...pf.products.map((p) => p.id), ...pf.waves.map((w) => w.id)]);
}
