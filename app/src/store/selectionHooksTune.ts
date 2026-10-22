/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import {
  aggEligibility, aggKnowledge, aggLifecycle, aggMaturity, aggMaturityMap, aggOpModel, aggProgram, aggReadiness, aggRisk, aggRunSizing, aggSetup, aggTokens,
  type Portfolio,
} from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** An aggregate of the "tune" group over the View's planned products (domain `agg*`), recomputed only when the portfolio or the selection changes. */
function useTuneAgg<T>(agg: (pf: Portfolio, ids: string[]) => T): T {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => agg(core, productIds), [agg, core, productIds]);
}

export const useMaturityMapAgg = () => useTuneAgg(aggMaturityMap);
export const useReadinessAgg = () => useTuneAgg(aggReadiness);
export const useLifecycleAgg = () => useTuneAgg(aggLifecycle);
export const useTokenAgg = () => useTuneAgg(aggTokens);
export const useKnowledgeAgg = () => useTuneAgg(aggKnowledge);
export const useRunSizingAgg = () => useTuneAgg(aggRunSizing);
export const useOpModelAgg = () => useTuneAgg(aggOpModel);
export const useSetupAgg = () => useTuneAgg(aggSetup);
export const useEligibilityAgg = () => useTuneAgg(aggEligibility);
export const useMaturityAgg = () => useTuneAgg(aggMaturity);
export const useProgramAgg = () => useTuneAgg(aggProgram);
export const useRiskAgg = () => useTuneAgg(aggRisk);
