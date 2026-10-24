/** @calc-zone foundation */
import { useMemo } from 'react';
import { keepersOf, type Keeper } from './commonEdit';
import { usePortfolio } from './hooks';
import { COMMON_VIEW, useViewProductId } from './productView';

/** Inside the in-place editor of the common values ("Edit: All products" in a Portfolio / Wave view). */
export const useInCommonView = (): boolean => useViewProductId() === COMMON_VIEW;

/** The top-bar "Edit" choice: 'all' (All products) or the id of the edited product. */
export const useEditTarget = (): string => usePortfolio((p) => ((p.editScope ?? 'all') === 'all' ? 'all' : p.activeProductId));

const NONE: Keeper[] = [];
/**
 * The products that keep their own value at an override address while the common values are edited in place (an override, or a knowledge subset
 * field): an edit of the common value does not reach them. Empty outside the common editor, so nothing changes anywhere else.
 */
export function useKeepers(ref: string): Keeper[] {
  const on = useInCommonView(), products = usePortfolio((p) => p.products);
  return useMemo(() => (on ? keepersOf(products, ref) : NONE), [on, products, ref]);
}
