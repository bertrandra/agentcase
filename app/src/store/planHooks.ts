/** @calc-zone delivery-views */
import { useCallback } from 'react';
import type { Ctx } from '@/domain';
import { consolidate, capacityOf, groupOf } from '@/domain/portfolio';
import { planViews, type PlanScope, type PlanViews } from '@/domain/programme/planBundle';
import { useCorePortfolio, useDisplayScope } from './consolidationHooks';
import { useCtxSelector, usePortfolio } from './hooks';
import { useOrg } from './orgHooks';
import { useActiveProductId, useIsMulti } from './portfolioHooks';

/**
 * The project views of the programme for the display scope (docs/SPEC_BPMN.md § 19.8; phase B9d): the Product scope reads the shown case,
 * the Wave, Unit (F-B81) and Portfolio scopes the consolidation, restricted to the selection's planned products (`groupOf`).
 * Recomputed when the case, the organisation or the portfolio changes; the component re-renders only when the views change (a selector with
 * structural equality: an edit the plan does not show, such as the customer name, renders nothing).
 */
export function usePlanViews(): PlanViews {
  const org = useOrg(), multi = useIsMulti(), shown = useDisplayScope(), core = useCorePortfolio(), id = useActiveProductId();
  const name = usePortfolio((p) => p.products.find((x) => x.id === id)?.name ?? 'Product');
  return useCtxSelector(useCallback((c: Ctx) => {
    const k = !multi || shown.kind === 'product' ? null : consolidate(core), g = k && shown.kind !== 'product' ? groupOf(k, shown) : null;
    const scope: PlanScope = !k || !g ? { kind: 'product' } : shown.kind === 'wave' ? { kind: 'wave', id: shown.id }
      : shown.kind === 'unit' ? { kind: 'unit', id: shown.id, name: g.label } : { kind: 'portfolio' };
    return planViews({ c, name, org, scope, productId: id, ...(k && g ? { k, capacity: capacityOf(core), ids: g.items.map((v) => v.id) } : {}) });
  }, [name, org, multi, shown, id, core]));
}
