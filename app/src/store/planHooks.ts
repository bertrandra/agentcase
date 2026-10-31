/** @calc-zone delivery-views */
import { useCallback } from 'react';
import type { Ctx } from '@/domain';
import { consolidate, capacityOf } from '@/domain/portfolio';
import { planViews, type PlanScope, type PlanViews } from '@/domain/programme/planBundle';
import { useCorePortfolio, useDisplayScope } from './consolidationHooks';
import { useCtxSelector, usePortfolio } from './hooks';
import { useOrg } from './orgHooks';
import { useActiveProductId, useIsMulti } from './portfolioHooks';

/**
 * The project views of the programme for the display scope (docs/SPEC_BPMN.md § 19.8; phase B9d): the Product scope reads the shown case,
 * the Wave and Portfolio scopes the consolidation. Recomputed when the case, the organisation or the portfolio changes; the component re-renders
 * only when the views change (a selector with structural equality: an edit the plan does not show, such as the customer name, renders nothing).
 */
export function usePlanViews(): PlanViews {
  const org = useOrg(), multi = useIsMulti(), shown = useDisplayScope(), core = useCorePortfolio(), id = useActiveProductId();
  const name = usePortfolio((p) => p.products.find((x) => x.id === id)?.name ?? 'Product');
  return useCtxSelector(useCallback((c: Ctx) => {
    const scope: PlanScope = !multi || shown.kind === 'product' ? { kind: 'product' } : shown.kind === 'wave' ? { kind: 'wave', id: shown.id }
      : { kind: 'portfolio' };
    return planViews({ c, name, org, scope, productId: id, ...(scope.kind === 'product' ? {} : { k: consolidate(core), capacity: capacityOf(core) }) });
  }, [name, org, multi, shown, id, core]));
}
