/** @calc-zone foundation */
import { useMemo } from 'react';
import { commonValue, corePortfolio, isOverridden, resolveProduct, type CommonCase, type Product, type SharedTeamLine, type Wave } from '@/domain/portfolio';
import { hasPortfolioContent } from './persistence/portfolioSnapshot';
import { caseResultOf, useDoc, usePortfolio } from './hooks';
import { shownProductId, useViewProductId } from './productView';
import { DEFAULT_PERSONA, withSavedPersona } from './persona';
import type { Doc, EditScope } from './types';

/** Products in display order (a stable reference until a product changes). */
export const useProducts = (): Product[] => usePortfolio((p) => p.products);
export const useWaves = (): Wave[] => usePortfolio((p) => p.waves);
const NO_LINES: SharedTeamLine[] = [];
/** The team lines shared between products ([] when none). */
export const useSharedTeam = (): SharedTeamLine[] => usePortfolio((p) => p.sharedTeam ?? NO_LINES);
export const useCommon = (): CommonCase => usePortfolio((p) => p.common);
export const useProductCount = (): number => usePortfolio((p) => p.products.length);
/** Progressive disclosure (spec F23): the multi-product interface exists from two products on. */
export const useIsMulti = (): boolean => usePortfolio((p) => p.products.length >= 2);
/**
 * True when the work is more than a plain single case (2+ products or waves, an override, a knowledge subset...): the exports then carry the
 * portfolio additions.
 */
export const useHasPortfolioContent = (): boolean => usePortfolio(hasPortfolioContent);
/** The edited product; inside a `ProductViewContext` (aggregate view) the product being shown instead. */
export const useActiveProductId = (): string => { const as = useViewProductId(); return usePortfolio((p) => shownProductId(p, as)); };
/** "Edit: all products / this product only"; 'all' until the user chooses (transient, never saved). */
export const useEditScope = (): EditScope => usePortfolio((p) => p.editScope ?? 'all');
/** This tab's persona (view state, D3; `store/persona.ts`). */
export const usePersona = (): string => usePortfolio((p) => p.persona ?? DEFAULT_PERSONA);
/** The case as a file stores it: the case plus the persona it opens on (`currentPersona`), e.g. for the Data Model's state registry. */
export function useSavedCase(): Doc { const doc = useDoc((d) => d), persona = usePersona();
  return useMemo(() => withSavedPersona(doc, persona), [doc, persona]); }
export const useActiveProduct = (): Product => {
  const as = useViewProductId();
  return usePortfolio((p) => p.products.find((x) => x.id === shownProductId(p, as)) ?? (p.products[0] as Product));
};

/** A product with its wave label and the computed case of its effective case (the existing `computeCase`, memoised per resolved case). */
export interface ProductRow { product: Product; wave: string; result: ReturnType<typeof caseResultOf> }
export function useProductRows(): ProductRow[] {
  const pf = usePortfolio(corePortfolio);   // not the whole portfolio: switching the active product or the scope recomputes nothing
  return useMemo(() => pf.products.map((product) => ({
    product, wave: pf.waves.find((w) => w.id === product.waveId)?.name ?? '', result: caseResultOf(resolveProduct(pf, product.id)),
  })), [pf]);
}

/** Inherited / overridden state of one overridable key (`selectedArtefacts`, `values.engagementCtx`, ...) for the active product. */
export interface FieldState { multi: boolean; productId: string; productName: string; overridden: boolean; common: unknown }
export function useFieldState(ref: string): FieldState {
  const multi = useIsMulti(), prod = useActiveProduct(), common = useCommon();
  return useMemo(() => ({ multi, productId: prod.id, productName: prod.name, overridden: isOverridden(prod, ref), common: commonValue(common, ref) }),
    [multi, prod, common, ref]);
}
