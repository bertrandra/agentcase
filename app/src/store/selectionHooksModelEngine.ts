import { useMemo } from 'react';
import { convergenceByProduct, evidenceByProduct, flowByProduct, stochasticByProduct, supervisionByProduct, verificationByProduct } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { usePortfolioSimulation } from './portfolioSimulation';
import { useViewScope } from './viewScope';

/** Hooks of the aggregate views of the "model-engine" group: the per-product status of each phase (`aggEngine`) over the products of the View. */
export const useStochasticRows = () => { const core = useCorePortfolio(), { productIds } = useViewScope(), { run } = usePortfolioSimulation(); return useMemo(() => stochasticByProduct(core, productIds, run), [core, productIds, run]); };
export const useConvergenceRows = () => { const core = useCorePortfolio(), { productIds } = useViewScope(); return useMemo(() => convergenceByProduct(core, productIds), [core, productIds]); };
export const useSupervisionRows = () => { const core = useCorePortfolio(), { productIds } = useViewScope(); return useMemo(() => supervisionByProduct(core, productIds), [core, productIds]); };
export const useFlowRows = () => { const core = useCorePortfolio(), { productIds } = useViewScope(); return useMemo(() => flowByProduct(core, productIds), [core, productIds]); };
export const useEvidenceRows = () => { const core = useCorePortfolio(), { productIds } = useViewScope(); return useMemo(() => evidenceByProduct(core, productIds), [core, productIds]); };
export const useVerificationRows = () => { const core = useCorePortfolio(), { productIds } = useViewScope(); return useMemo(() => verificationByProduct(core, productIds), [core, productIds]); };
