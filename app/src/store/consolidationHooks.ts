/** @calc-zone portfolio-consolidation */
import { useMemo } from 'react';
import {
  consolidate, consolidationView, corePortfolio, portfolioGantt, scopeHeadline, waveBoard,
  type BoardColumn, type ConsolidationView, type DisplayScope, type Portfolio, type PortfolioGantt, type PortfolioHeadline,
} from '@/domain/portfolio';
import { usePortfolio } from './hooks';

const PRODUCT: DisplayScope = { kind: 'product' };

/**
 * The portfolio as the figures see it: a stable reference until the common values, products, waves, hub, horizon or start date change
 * (switching the active product or the display scope never recomputes the views below).
 */
export const useCorePortfolio = (): Portfolio => usePortfolio(corePortfolio);

/** The display scope of the top bar: the active product (default), the portfolio, or a wave that still exists. */
export const useDisplayScope = (): DisplayScope => usePortfolio((p) => {
  const s = p.displayScope;
  return !s || (s.kind === 'wave' && !p.waves.some((w) => w.id === s.id)) ? PRODUCT : s;
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
