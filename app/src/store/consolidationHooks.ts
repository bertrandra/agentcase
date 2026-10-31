/** @calc-zone portfolio-consolidation */
import { useMemo } from 'react';
import {
  consolidate, consolidationView, corePortfolio, portfolioGantt, portfolioUnits, scopeExists, scopeHeadline, scopeMembers, waveBoard,
  type BoardColumn, type ConsolidationView, type DisplayScope, type Portfolio, type PortfolioGantt, type PortfolioHeadline,
} from '@/domain/portfolio';
import { unitTree } from '@/domain/org';
import { usePortfolio, usePortfolioSelector } from './hooks';

const PRODUCT: DisplayScope = { kind: 'product' };

/**
 * The portfolio as the figures see it: a stable reference until the common values, products, waves, hub, horizon or start date change
 * (switching the active product or the display scope never recomputes the views below).
 */
export const useCorePortfolio = (): Portfolio => usePortfolio(corePortfolio);

/** The display scope of the top bar: the active product (default), the portfolio, or a wave or a unit that still exists. */
export const useDisplayScope = (): DisplayScope => usePortfolio((p) => {
  const s = p.displayScope;
  return !s || !scopeExists(p, s) ? PRODUCT : s;
});

/** Section "Consolidation": the view model of the consolidated series (headline, chart, tables by wave and product, diagnostics). */
export function useConsolidation(): ConsolidationView {
  const core = useCorePortfolio();
  return useMemo(() => consolidationView(core, consolidate(core)), [core]);
}

/** Section "Waves": columns = waves then the unplanned products, with the wave aggregates. */
export function useWaveBoard(): BoardColumn[] {
  const core = useCorePortfolio();
  return useMemo(() => waveBoard(core, consolidate(core)), [core]);
}

/** Gantt of the waves (one bar per wave, products and their milestones). */
export function usePortfolioGantt(): PortfolioGantt {
  const core = useCorePortfolio();
  return useMemo(() => portfolioGantt(core, consolidate(core)), [core]);
}

/** The headline bar's figures for the display scope, or null for the active product (the bar then reads its own case, as with one product). */
export function useScopeKpis(): { label: string; headline: PortfolioHeadline } | null {
  const core = useCorePortfolio(), scope = useDisplayScope();
  return useMemo(() => (scope.kind === 'product' || core.products.length < 2 ? null : scopeHeadline(consolidate(core), scope)), [core, scope]);
}

const NO_MEMBERS = null;
/**
 * The products a Wave or a Unit view names (planned or not, portfolio order) and its label, for the top bar's "Change" grouping; null for the
 * Product and Portfolio views. Structurally compared: an edit of the case re-renders nothing.
 */
export function useScopeMembers(): { label: string; kind: 'wave' | 'unit'; ids: string[] } | null {
  const scope = useDisplayScope();
  return usePortfolioSelector((p) => {
    if (scope.kind !== 'wave' && scope.kind !== 'unit') return NO_MEMBERS;
    const m = scopeMembers(corePortfolio(p), scope);
    return m ? { label: m.label, kind: scope.kind, ids: [...m.planned, ...m.excluded] } : NO_MEMBERS;
  });
}

/** A node of the unit tree as the "Show" selector lists it: id, name and depth (0 = a root). */
export interface UnitNode { id: string; name: string; depth: number }
const unitNodes = (p: Portfolio): UnitNode[] => unitTree({ units: portfolioUnits(p) }).map(({ unit, depth }) => ({ id: unit.id, name: unit.name, depth }));
/** The organisation's units in tree order with their depth (F-B81: each one is a display scope). Structurally compared. */
export const useUnitNodes = (): UnitNode[] => usePortfolioSelector(unitNodes);
