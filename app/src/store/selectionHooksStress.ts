/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import { compareByProduct, portfolioScenarios, portfolioSensitivity, scenarioByProduct, selectionStress, sensitivityByProduct,
  type SelectionStress } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { usePortfolioSimulation } from './portfolioSimulation';
import { useViewScope } from './viewScope';

/** Hooks of the aggregate views of the "stress" group: the domain functions of `aggStress` over the products of the View. */

/** The six scenarios of each product in view (the product's own `scenarioSet`). */
export const useScenarioRows = () => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => scenarioByProduct(core, productIds), [core, productIds]);
};
/** The six scenarios summed over the products of the View on the portfolio calendar, with the per-product breakdown (domain `portfolioScenarios`). */
export const usePortfolioScenarios = () => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => portfolioScenarios(core, productIds), [core, productIds]);
};
/** The tornado of the products of the View on the portfolio calendar: every driver moved by `step` % on each product (domain `portfolioSensitivity`). */
export const usePortfolioSensitivity = (step: number) => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => portfolioSensitivity(core, productIds, step), [core, productIds, step]);
};
/** AS-IS / classic saving / Agentic at the horizon end, per product, with the domain's roll-up line. */
export const useCompareRows = () => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => compareByProduct(core, productIds), [core, productIds]);
};
/** The key parameters and ROI span of each product in view. */
export const useSensitivityRows = () => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => sensitivityByProduct(core, productIds), [core, productIds]);
};

/** The last portfolio Monte Carlo read for the View (Portfolio or Wave); null without a run or for a wave the run does not hold. */
export function useSelectionStress(): SelectionStress | null {
  const { run } = usePortfolioSimulation(), vs = useViewScope();
  return useMemo(() => (run && vs.kind !== 'product' ? selectionStress(run,
    vs.kind === 'wave' ? { kind: 'wave', id: vs.waveId as string } : { kind: 'portfolio' }) : null), [run, vs]);
}
