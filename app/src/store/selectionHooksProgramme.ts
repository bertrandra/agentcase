/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import { scopeProgramme, type ProgrammeAgg } from '@/domain/portfolio/aggProgramme';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** Read-only synthesis of the 📋 Programme section over the View's products (memoised on the portfolio and the selection). */
export function useScopeProgramme(): ProgrammeAgg {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => scopeProgramme(core, productIds), [core, productIds]);
}
