import { useMemo } from 'react';
import { scopeLifecycle, scopeParams, scopePhases, scopeScurve, scopeSelection, type Portfolio } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** Read-only syntheses of the "scope" group's inputs over the View's products (domain `scope*`, memoised on the portfolio and the selection). */
const make = <T,>(fn: (pf: Portfolio, ids: string[]) => T) => (): T => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => fn(core, productIds), [core, productIds]);
};
export const useScopeParams = make(scopeParams);
export const useScopeScurve = make(scopeScurve);
export const useScopePhases = make(scopePhases);
export const useScopeLifecycle = make(scopeLifecycle);
export const useScopeSelection = make(scopeSelection);
