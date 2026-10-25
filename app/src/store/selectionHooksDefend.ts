/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import { assumptionsByProduct, dueDiligenceByProduct, verifByProduct } from '@/domain/portfolio';
import { benchmarkBase } from '@/domain/pdc/assumptions';
import { ddBase } from '@/domain/pdc/dd';
import type { ConvRuntime } from '@/domain/pdc/verifConvTypes';
import defaultDoc from './defaults/defaultDoc.json';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** Hooks of the aggregate views of the "defend" group (`aggDefend`) over the products of the View. The benchmark base is the shipped default document. */
const assumptionBase = benchmarkBase(defaultDoc), dd = ddBase(defaultDoc);
export const useAssumptionRows = () => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => assumptionsByProduct(core, productIds, assumptionBase), [core, productIds]);
};
/** `rt` is the session state some audits read (section catalogue, dependency registry); pass a module constant so the memo holds. */
export const useVerifRows = (rt: ConvRuntime) => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => verifByProduct(core, productIds, rt), [core, productIds, rt]);
};
export const useDueDiligenceRows = () => {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => dueDiligenceByProduct(core, productIds, dd), [core, productIds]);
};
