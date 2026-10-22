import { useMemo } from 'react';
import { baselineLocStrat } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** Read-only synthesis of the "baseline" group's location strategy over the View's products. */
export function useLocStratAggregate() {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => baselineLocStrat(core, productIds), [core, productIds]);
}
