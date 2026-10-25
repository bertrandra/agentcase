/** @calc-zone product-resolution */
import { applySubsetToCommon, applyToCommon, clearOverride, setKnowledge, setOverride, type KnowledgeSubset, type SubsetField } from '@/domain/portfolio';
import { definePortfolioCommand } from '@/store/commands';
import { subsetFieldOfRef } from '@/store/commonEdit';
import { appStore } from '@/store/instance';
import type { PortfolioDoc } from '@/store/types';
import { dispatchChecked } from './portfolioGuard';

/** The hub activation lives in two places (portfolio hub, common khEnabled); writing the common one keeps the other in step. */
const mirrorHub = (pf: PortfolioDoc): PortfolioDoc => {
  const on = !!pf.common.dom.checked.khEnabled;
  return pf.hub.enabled === on ? pf : { ...pf, hub: { ...pf.hub, enabled: on } };
};

const setCmd = definePortfolioCommand<{ id: string; ref: string; value: unknown }>({
  type: 'product.setOverride', label: (p) => `Override ${p.ref} for this product`, apply: (pf, p) => setOverride(pf, p.id, p.ref, p.value),
});
const clearCmd = definePortfolioCommand<{ id: string; ref: string }>({
  type: 'product.clearOverride', label: (p) => `Back to common: ${p.ref}`, apply: (pf, p) => clearOverride(pf, p.id, p.ref),
});
const toCommonCmd = definePortfolioCommand<{ id: string; ref: string }>({
  type: 'product.applyToCommon', label: (p) => `Apply ${p.ref} to all products`, apply: (pf, p) => mirrorHub(applyToCommon(pf, p.id, p.ref)),
});
const subsetToCommonCmd = definePortfolioCommand<{ id: string; field: SubsetField }>({
  type: 'product.applySubsetToCommon', label: (p) => `Apply knowledge ${p.field} to all products`,
  apply: (pf, p) => mirrorHub(applySubsetToCommon(pf, p.id, p.field)),
});
const knowledgeCmd = definePortfolioCommand<{ id: string; patch: KnowledgeSubset; clear: (keyof KnowledgeSubset)[] }>({
  type: 'product.setKnowledge', label: () => 'Edit product knowledge subset',
  coalesceKey: (p) => `product.setKnowledge:${p.id}:${Object.keys(p.patch).join(',')}`,
  apply: (pf, p) => setKnowledge(pf, p.id, p.patch, p.clear),
});

/**
 * The product takes its own value for an overridable key (`selectedArtefacts`, `phaseOff`, ..., or one form field `values.<id>` / `checked.<id>`).
 * Throws for a key off the whitelist.
 */
export const setProductOverride = (id: string, ref: string, value: unknown): boolean => dispatchChecked(setCmd({ id, ref, value }));
/** "Back to common": the product inherits the key again. */
export const clearProductOverride = (id: string, ref: string): boolean => dispatchChecked(clearCmd({ id, ref }));
/** "Apply to all products": the product's value becomes the common one; every override now identical to it is dropped. */
export const applyOverrideToCommon = (id: string, ref: string): boolean => dispatchChecked(toCommonCmd({ id, ref }));
/**
 * "Apply to all products" for a field of the product's knowledge subset: its value becomes the common one and every product holding the identical
 * value inherits it again. One undoable step; false (nothing changes) for a field the common case does not hold or the product does not set.
 */
export const applySubsetFieldToCommon = (id: string, field: SubsetField): boolean => dispatchChecked(subsetToCommonCmd({ id, field }));
/**
 * Set fields of the product's knowledge subset (an absent field is inherited from the hub); `clear` drops fields. Domain weights must add up
 * to 100, `targetCC` in [0, 4], `ktLeadMonths` >= 0, nine maturity answers in [0, 4]: otherwise nothing changes and false is returned.
 */
export const setProductKnowledge = (id: string, patch: KnowledgeSubset,
  clear: (keyof KnowledgeSubset)[] = []): boolean => dispatchChecked(knowledgeCmd({ id, patch, clear }));

/** "Reset to common" from the common editor: the product drops its own value at `ref` (an override, or the matching knowledge-subset field). Undoable. */
export function resetToCommon(id: string, ref: string): boolean {
  const f = subsetFieldOfRef(ref), prod = appStore().getState().portfolio.products.find((p) => p.id === id);
  if (f && prod?.knowledge[f] !== undefined) return setProductKnowledge(id, {}, [f]);
  return clearProductOverride(id, ref);
}
