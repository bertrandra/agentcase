/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import { aggregateTeams, consolidate, inputSummary, selectionView, type InputSummaryRow, type SelectionView, type TeamAggregate } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** Consolidated figures of the View (Portfolio or Wave) for the result sections; null for a Product view (the section then reads its own case). */
export function useSelectionView(): SelectionView | null {
  const core = useCorePortfolio(), vs = useViewScope();
  return useMemo(() => (vs.kind === 'product' || !vs.multi ? null : selectionView(core, consolidate(core), vs.kind === 'wave' ? { kind: 'wave', id: vs.waveId as string } : { kind: 'portfolio' })), [core, vs]);
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
