/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import { aggregateTeams, consolidate, corePortfolio, inputSummary, selectionView, type InputSummaryRow, type SelectionView, type TeamAggregate } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { usePortfolioSelector } from './hooks';
import { useViewProductId } from './productView';
import { useViewScope } from './viewScope';

/**
 * Consolidated figures of the View (Portfolio or Wave) for the result sections; null for a Product view (the section then reads its own case). A selector
 * with structural equality: an edit that changes none of the View's figures (a name, a note) does not re-render the aggregate sections.
 */
export function useSelectionView(): SelectionView | null {
  const pinned = useViewProductId() !== null;
  return usePortfolioSelector((p) => {
    const core = corePortfolio(p), s = p.displayScope, wave = s?.kind === 'wave' && p.waves.some((w) => w.id === s.id) ? s.id : null;
    if (pinned || core.products.length < 2 || !s || s.kind === 'product' || (s.kind === 'wave' && !wave)) return null;
    return selectionView(core, consolidate(core), wave ? { kind: 'wave', id: wave } : { kind: 'portfolio' });
  });
}

/** What each product of the View amounts to in a few input counts (team, artefacts, overrides, hub): the generic read-only synthesis of an input section. */
export function useInputSummary(): InputSummaryRow[] {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => inputSummary(core, productIds), [core, productIds]);
}

/** The entry teams of the View's products added up by skill, grade and location (domain `aggregateTeams`), with a line per product. */
export function useTeamAggregate(): TeamAggregate {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => aggregateTeams(core, productIds), [core, productIds]);
}
