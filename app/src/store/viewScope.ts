/** @calc-zone product-resolution */
import { useMemo } from 'react';
import { scheduledProducts, unscheduledIds, type Portfolio } from '@/domain/portfolio';
import { useCorePortfolio, useDisplayScope } from './consolidationHooks';
import { useViewProductId } from './productView';
import { useActiveProductId } from './portfolioHooks';

/** What the top-bar "View" selects, as every section reads it (aggregate view). */
export interface ViewScope {
  kind: 'product' | 'wave' | 'portfolio';
  /** "Portfolio", the wave's name, or the product's name */
  label: string;
  /** 2+ products: the multi-product interface exists; with one product nothing of the aggregate view is shown */
  multi: boolean;
  /** the planned, non-archived products of the selection, in portfolio order (the figures' scope); a Product view holds the edited product alone */
  productIds: string[];
  /** products of the selection left out of the figures: archived, or without a (known) wave */
  excludedIds: string[];
  waveId?: string;
  /** the product the sections edit (or, inside a `ProductViewContext`, the product being shown) */
  activeProductId: string;
  activeProductName: string;
}

/** Pure part of `useViewScope`: the selection of a display scope over the portfolio's figures. Memoised by the hook, tested alone. */
export function viewScopeOf(core: Portfolio, display: { kind: string; id?: string }, active: string): ViewScope {
  const planned = scheduledProducts(core), nameOf = (id: string) => core.products.find((p) => p.id === id)?.name ?? id;
  const base = { multi: core.products.length >= 2, activeProductId: active, activeProductName: nameOf(active) };
  if (display.kind === 'portfolio') {
    return { ...base, kind: 'portfolio', label: 'Portfolio', productIds: planned.map((s) => s.product.id), excludedIds: unscheduledIds(core) };
  }
  const wave = display.kind === 'wave' ? core.waves.find((w) => w.id === display.id) : undefined;
  if (wave) {
    const ids = planned.filter((s) => s.wave.id === wave.id).map((s) => s.product.id);
    return { ...base, kind: 'wave', label: wave.name, waveId: wave.id, productIds: ids, excludedIds: wave.productIds.filter((id) => !ids.includes(id)) };
  }
  return { ...base, kind: 'product', label: base.activeProductName, productIds: [active], excludedIds: [] };
}

/**
 * The View as a hook: kind, label and the products behind it. A stable reference until the portfolio's figures, the View or the edited product change.
 * Inside a `ProductViewContext` the View is that product (a per-product render never sees the selection it is drilled from).
 */
export function useViewScope(): ViewScope {
  const core = useCorePortfolio(), display = useDisplayScope(), active = useActiveProductId(), pinned = useViewProductId() !== null;
  const kind = pinned ? 'product' : display.kind, id = display.kind === 'wave' ? display.id : undefined;
  return useMemo(() => viewScopeOf(core, { kind, id }, active), [core, kind, id, active]);
}
