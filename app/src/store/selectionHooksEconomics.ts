/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import { aggregateAnnual, aggregateMonthly, aggregateRun, consolidate, type AnnualAgg, type DisplayScope, type MonthlyAgg, type Portfolio, type RunAgg } from '@/domain/portfolio';
import type { Consolidated } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** The View as a domain scope; null for a Product view (the section then reads its own case). */
function scopeOf(vs: ReturnType<typeof useViewScope>): DisplayScope | null {
  return vs.kind === 'product' || !vs.multi ? null : vs.kind === 'wave' ? { kind: 'wave', id: vs.waveId as string } : { kind: 'portfolio' };
}

/**
 * A pure aggregate of the domain over the View (Portfolio or Wave), recomputed only when the portfolio's figures or the View change; null for a
 * Product view.
 */
export function useAggregate<T>(build: (pf: Portfolio, c: Consolidated, scope: DisplayScope) => T | null): T | null {
  const core = useCorePortfolio(), vs = useViewScope();
  return useMemo(() => { const s = scopeOf(vs); return s ? build(core, consolidate(core), s) : null; }, [core, vs, build]);
}

/** Section Agentic Run: recurring costs of the View by calendar year and by product. */
export const useRunAggregate = (): RunAgg | null => useAggregate(aggregateRun);
/** Section Annual summary: the View by calendar year. */
export const useAnnualAggregate = (): AnnualAgg | null => useAggregate(aggregateAnnual);
/** Section Monthly detail: the View month by month on the calendar axis. */
export const useMonthlyAggregate = (): MonthlyAgg | null => useAggregate(aggregateMonthly);
