import { lazy, type ComponentType } from 'react';
import { useViewScope } from '@/store/viewScope';
import { SECTION_AGGREGATES } from '../sections/aggregates';
import { FALLBACKS, type FallbackProps } from './fallbacks';
import { followsView, sectionKind } from './sectionScope';

/** What the host renders for a section under the current Vue. */
export type Scoped =
  | { mode: 'section' }                                          // the section as it always was (Produit view, one product, reference / portfolio sections)
  | { mode: 'aggregate'; Cmp: ComponentType }                    // the section's registered Vue agrégée (lazy)
  | { mode: 'fallback'; Fallback: ComponentType<FallbackProps> };  // the generic Vue agrégée of its kind

const SECTION: Scoped = { mode: 'section' };
const cache = new Map<string, Scoped>();

/**
 * Picks what to render for section `id` (docs/VUE_AGREGEE.md): with a single product, a Produit view, or a section that does not follow the Vue
 * (`S-static`, `P-portfolio`) the section itself, untouched; with a Vague / Portefeuille its registered `aggregate` component if any, else the generic
 * fallback of its kind. Results are module-level constants, so the host re-renders without remounting.
 */
export function useScopedSection(id: string): Scoped {
  const vs = useViewScope(), kind = sectionKind(id);
  if (!vs.multi || vs.kind === 'product' || !followsView(kind)) return SECTION;
  let hit = cache.get(id);
  if (!hit) {
    const loader = SECTION_AGGREGATES[id], Fallback = FALLBACKS[kind];
    hit = loader ? { mode: 'aggregate', Cmp: lazy(loader) } : Fallback ? { mode: 'fallback', Fallback } : SECTION;
    cache.set(id, hit);
  }
  return hit;
}
