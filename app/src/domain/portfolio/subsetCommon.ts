/** @calc-zone product-resolution */
import { withCommonValues } from './layers';
import { deepEqual } from './overrides';
import { subsetKeys, type SubsetField } from './subset';
import type { Portfolio } from './types';

/** The subset fields the common case holds (as `khEnabled`, `khA0..khA8`, `khTargetCC`, ...): only these can be applied to all products. */
export const COMMON_SUBSET_FIELDS: readonly SubsetField[] = ['enabled', 'maturityAnswers', 'targetCC', 'curationFTE', 'setupBase'];
export const hasCommonLevel = (f: SubsetField): boolean => COMMON_SUBSET_FIELDS.includes(f);

/**
 * "Apply to all products" for a knowledge-subset field (spec F7): the product's own value is written at the common level (the case keys of
 * `subsetKeys`), and every product whose subset holds the identical value drops it (it inherits the same value again). Unchanged for a field the
 * common case does not hold (domains, preparation months) or that the product does not set.
 */
export function applySubsetToCommon<T extends Portfolio>(pf: T, productId: string, f: SubsetField): T {
  const value = pf.products.find((p) => p.id === productId)?.knowledge[f];
  if (value === undefined || !hasCommonLevel(f)) return pf;
  const patch = subsetKeys({ [f]: value }), dom = pf.common.dom;
  const products = pf.products.map((p) => {
    if (!deepEqual(p.knowledge[f], value)) return p;
    const knowledge = { ...p.knowledge };
    delete knowledge[f];
    return { ...p, knowledge };
  });
  const withValues = withCommonValues(pf.common, patch.values);   // schema v4: the hub values are programme values (the common document)
  const common = { ...withValues, dom: { ...withValues.dom, checked: { ...dom.checked, ...patch.checked } } };
  return { ...pf, common, products };
}
