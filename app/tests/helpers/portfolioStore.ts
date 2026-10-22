import { addWave } from '@/controllers/wave';
import { addProduct, setActiveProduct } from '@/controllers/product';
import { EMPTY_HISTORY } from '@/store/history';
import type { AppStore } from '@/store/core';
import { freshStore } from '../store/helpers';

export interface Three { s: AppStore; ids: [string, string, string]; waves: [string, string] }

/** A store holding 3 products in 2 waves (A and B in wave 1, C in wave 2 starting at month 6); the first product is active. */
export function threeProducts(now: () => number = () => 0): Three {
  const s = freshStore(now), a = s.getState().portfolio.products[0]!.id, w1 = s.getState().portfolio.waves[0]!.id;
  const b = addProduct('B', w1)!, w2 = addWave('Wave 2', 6)!, c = addProduct('C', w2)!;
  setActiveProduct(a);
  s.setHistory(EMPTY_HISTORY);   // the set-up is the starting point, not an undo step
  return { s, ids: [a, b, c], waves: [w1, w2] };
}
/** The portfolio without its view state (active product, edit scope), which is not part of the history. */
export const docOnly = (s: AppStore): string => {
  const { activeProductId: _a, editScope: _e, displayScope: _d, ...rest } = s.getState().portfolio as unknown as Record<string, unknown>;
  void _a; void _e; void _d;
  return JSON.stringify(rest);
};
