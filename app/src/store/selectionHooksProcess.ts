/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import { scopeProcess, type ProcessAgg } from '@/domain/portfolio/aggProcess';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** Read-only synthesis of the 🧩 Process (BPMN) section over the View's products (memoised on the portfolio and the selection). */
export function useScopeProcess(): ProcessAgg {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => scopeProcess(core, productIds), [core, productIds]);
}
