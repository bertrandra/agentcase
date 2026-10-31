/** @calc-zone foundation */
import { useMemo } from 'react';
import { corePortfolio, scopeExists, scopeMembers, type Portfolio } from '@/domain/portfolio';
import { useCorePortfolio, useDisplayScope } from './consolidationHooks';
import { usePortfolio } from './hooks';
import { useViewProductId } from './productView';
import { useActiveProductId } from './portfolioHooks';

/** What the top-bar "View" selects, as every section reads it (aggregate view). */
export interface ViewScope {
  kind: 'product' | 'wave' | 'unit' | 'portfolio';
  /** "Portfolio", the wave's or the unit's name ("Unassigned"), or the product's name */
  label: string;
  /** 2+ products: the multi-product interface exists; with one product nothing of the aggregate view is shown */
  multi: boolean;
  /** the planned, non-archived products of the selection, in portfolio order (the figures' scope); a Product view holds the edited product alone */
  productIds: string[];
  /** products of the selection left out of the figures: archived, or without a (known) wave */
  excludedIds: string[];
  waveId?: string;
  /** the unit of a Unit view (`UNASSIGNED_UNIT` for the products without an owner) */
  unitId?: string;
  /** the product the sections edit (or, inside a `ProductViewContext`, the product being shown) */
  activeProductId: string;
  activeProductName: string;
}

/** Pure part of `useViewScope`: the selection of a display scope over the portfolio's figures. Memoised by the hook, tested alone. */
export function viewScopeOf(core: Portfolio, display: { kind: string; id?: string }, active: string): ViewScope {
  const nameOf = (id: string) => core.products.find((p) => p.id === id)?.name ?? id;
  const base = { multi: core.products.length >= 2, activeProductId: active, activeProductName: nameOf(active) };
  const kind = display.kind, id = display.id ?? '';
  const m = kind === 'portfolio' ? scopeMembers(core, { kind }) : kind === 'wave' || kind === 'unit' ? scopeMembers(core, { kind, id }) : null;
  if (m && (kind === 'portfolio' || kind === 'wave' || kind === 'unit')) {
    return { ...base, kind, label: m.label, ...(kind === 'wave' ? { waveId: id } : kind === 'unit' ? { unitId: id } : {}), productIds: m.planned,
      excludedIds: m.excluded };
  }
  return { ...base, kind: 'product', label: base.activeProductName, productIds: [active], excludedIds: [] };
}

/**
 * The kind of the View, whether the multi-product interface exists and whether a Wave or a Unit view holds no planned product (`empty`: the
 * sections then show the empty state), without the portfolio's figures: a component that only picks WHAT to render (the section host) re-renders
 * when these change, not on every edit of the case.
 */
export function useViewKind(): { kind: ViewScope['kind']; multi: boolean; empty: boolean } {
  const multi = usePortfolio((p) => p.products.length >= 2), display = useDisplayScope(), pinned = useViewProductId() !== null;
  const kind = pinned ? 'product' : display.kind, empty = usePortfolio((p) => !pinned && isEmpty(p));
  return useMemo(() => ({ kind, multi, empty }), [kind, multi, empty]);
}

/** A Wave or Unit view (that exists) with no planned product. */
function isEmpty(p: Portfolio & { displayScope?: { kind: string; id?: string } }): boolean {
  const s = p.displayScope;
  if (!s || (s.kind !== 'wave' && s.kind !== 'unit') || !scopeExists(p, { kind: s.kind, id: s.id ?? '' })) return false;
  return scopeMembers(corePortfolio(p), { kind: s.kind, id: s.id ?? '' })?.planned.length === 0;
}

/**
 * The View as a hook: kind, label and the products behind it. A stable reference until the portfolio's figures, the View or the edited product change.
 * Inside a `ProductViewContext` the View is that product (a per-product render never sees the selection it is drilled from).
 */
export function useViewScope(): ViewScope {
  const core = useCorePortfolio(), display = useDisplayScope(), active = useActiveProductId(), pinned = useViewProductId() !== null;
  const kind = pinned ? 'product' : display.kind, id = display.kind === 'wave' || display.kind === 'unit' ? display.id : undefined;
  return useMemo(() => viewScopeOf(core, { kind, id }, active), [core, kind, id, active]);
}
