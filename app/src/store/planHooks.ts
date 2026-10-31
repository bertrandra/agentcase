/** @calc-zone delivery-views */
import { useMemo } from 'react';
import { consolidate, capacityOf } from '@/domain/portfolio';
import { planViews, type PlanScope, type PlanViews } from '@/domain/programme/planBundle';
import { useCorePortfolio, useDisplayScope } from './consolidationHooks';
import { useCtx, usePortfolio } from './hooks';
import { useOrg } from './orgHooks';
import { useActiveProductId, useIsMulti } from './portfolioHooks';

/**
 * The project views of the programme for the display scope (docs/SPEC_BPMN.md § 19.8; phase B9d): the Product scope reads the shown case,
 * the Wave and Portfolio scopes the consolidation. Recomputed when the case, the organisation or the portfolio changes.
 */
export function usePlanViews(): PlanViews {
  const c = useCtx(), org = useOrg(), multi = useIsMulti(), shown = useDisplayScope(), core = useCorePortfolio(), id = useActiveProductId();
  const name = usePortfolio((p) => p.products.find((x) => x.id === id)?.name ?? 'Product');
  return useMemo(() => {
    const scope: PlanScope = !multi || shown.kind === 'product' ? { kind: 'product' } : shown.kind === 'wave' ? { kind: 'wave', id: shown.id }
      : { kind: 'portfolio' };
    return planViews({ c, name, org, scope, productId: id, ...(scope.kind === 'product' ? {} : { k: consolidate(core), capacity: capacityOf(core) }) });
  }, [c, name, org, multi, shown, id, core]);
}
