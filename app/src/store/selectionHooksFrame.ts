/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import { frameEngage, frameEngagement, frameIndustry, type Portfolio } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** Read-only syntheses of the "frame" group's inputs over the View's products. */
const make = <T,>(fn: (pf: Portfolio, ids: string[]) => T) => (): T => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => fn(core, productIds), [core, productIds]);
};
export const useFrameEngagement = make(frameEngagement);
export const useFrameEngage = make(frameEngage);
export const useFrameIndustry = make(frameIndustry);
