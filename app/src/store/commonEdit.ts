/** @calc-zone product-resolution */
import { effectiveTeam, isOverridden, parseRef, resolveCommon, scopeExists, type Portfolio, type Product, type SubsetField } from '@/domain/portfolio';
import { subsetField } from './address/subset';
import type { Doc, PortfolioDoc } from './types';

/**
 * "Edit: All products" with a Portfolio, a Wave or a Unit in view (2+ products): the case commands run on the COMMON case (`commonEditDoc`) and every change
 * goes to the common values, whatever a product overrides (the entry team excepted: it is always the active product's). In a Product view,
 * "All products" keeps its historical meaning: the product's own (already overridden) keys stay on the product (spec 6.1, P2).
 */
export function editsCommon(pf: PortfolioDoc): boolean {
  const d = pf.displayScope;
  if (pf.products.length < 2 || (pf.editScope ?? 'all') !== 'all' || !d || d.kind === 'product') return false;
  return scopeExists(pf, d);
}

const activeOf = (pf: Portfolio): Product => pf.products.find((p) => p.id === pf.activeProductId) ?? (pf.products[0] as Product);

/** The case every product inherits, as a `Doc` (identity-stable while the common values, the hub and the active team are). */
export const commonEditDoc = (pf: Portfolio): Doc => resolveCommon(pf, effectiveTeam(pf, activeOf(pf))) as Doc;

const SUBSET: readonly SubsetField[] = ['enabled', 'domains', 'maturityAnswers', 'targetCC', 'curationFTE', 'setupBase', 'ktLeadMonths'];

/** The knowledge-subset field behind an address (`values.khA3` -> maturityAnswers, `checked.khEnabled` -> enabled, `knowledge.domains` -> domains), or null. */
export function subsetFieldOfRef(ref: string): SubsetField | null {
  if (ref.startsWith('knowledge.')) { const f = ref.slice(10) as SubsetField; return SUBSET.includes(f) ? f : null; }
  const p = parseRef(ref);
  return p && p.kind !== 'top' ? (subsetField(p.kind, p.id) as SubsetField | null) : null;
}

/** A product that keeps its own value at an address, and where that value lives (an override, or its knowledge subset). */
export interface Keeper { id: string; name: string; via: 'override' | 'subset' }

/**
 * The products whose own value at `ref` hides the common one (an edit of the common value does not reach them). `ref` is an override address or
 * `knowledge.<subset field>`; [] off the whitelist.
 */
export function keepersOf(products: readonly Product[], ref: string): Keeper[] {
  const f = subsetFieldOfRef(ref), top = parseRef(ref) !== null, out: Keeper[] = [];
  if (!f && !top) return [];
  for (const p of products) {
    if (f && p.knowledge[f] !== undefined) out.push({ id: p.id, name: p.name, via: 'subset' });
    else if (top && isOverridden(p, ref)) out.push({ id: p.id, name: p.name, via: 'override' });
  }
  return out;
}
