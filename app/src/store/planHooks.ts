/** @calc-zone delivery-views */
import { useCallback } from 'react';
import { makeCtx, type Ctx } from '@/domain';
import { orgOf, type OrgModel } from '@/domain/org';
import { consolidate, capacityOf, corePortfolio, effortLineShares, groupOf, scopeExists, type DisplayScope, type Portfolio } from '@/domain/portfolio';
import { planViews, type PlanScope, type PlanViews } from '@/domain/programme/planBundle';
import { useCorePortfolio, useDisplayScope } from './consolidationHooks';
import { activeDoc } from './editBase';
import { useCtxSelector, usePortfolio } from './hooks';
import { appStore } from './instance';
import { useOrg } from './orgHooks';
import { useActiveProductId, useIsMulti } from './portfolioHooks';

/**
 * The project views of the programme for the display scope (docs/SPEC_BPMN.md § 19.8; phase B9d): the Product scope reads the shown case,
 * the Wave, Unit (F-B81) and Portfolio scopes the consolidation, restricted to the selection's planned products (`groupOf`).
 * Recomputed when the case, the organisation or the portfolio changes; the component re-renders only when the views change (a selector with
 * structural equality: an edit the plan does not show, such as the customer name, renders nothing).
 */
function viewsFor(c: Ctx, name: string, org: OrgModel, multi: boolean, shown: DisplayScope, id: string, core: Portfolio): PlanViews {
  const k = !multi || shown.kind === 'product' ? null : consolidate(core), g = k && shown.kind !== 'product' ? groupOf(k, shown) : null;
  const scope: PlanScope = !k || !g ? { kind: 'product' } : shown.kind === 'wave' ? { kind: 'wave', id: shown.id }
    : shown.kind === 'unit' ? { kind: 'unit', id: shown.id, name: g.label } : { kind: 'portfolio' };
  return planViews({ c, name, org, scope, productId: id, ...(k && g ? { k, capacity: capacityOf(core), ids: g.items.map((v) => v.id) } : {}) });
}

/**
 * The same plan views read from the store at the time of a call (no hook, nothing kept): the exports that add the plan as an optional section
 * (SPEC_FIXES FX-D15: the Financial workbook's plan sheets, the report's plan pages) read the plan the 📅 Plan screen would show.
 */
export function currentPlanViews(): PlanViews {
  const p = appStore().getState().portfolio, d = activeDoc(), id = p.activeProductId, multi = p.products.length >= 2;
  const shown: DisplayScope = p.displayScope && scopeExists(p, p.displayScope) ? p.displayScope : { kind: 'product' };
  const org = orgOf({ products: p.products, common: { BPMN: p.common.BPMN }, customer: String(d.customerName ?? ''), effort: effortLineShares(p) }, d.BPMN,
    multi ? id : undefined);
  return viewsFor(makeCtx(d), p.products.find((x) => x.id === id)?.name ?? 'Product', org, multi, shown, id, corePortfolio(p));
}

export function usePlanViews(): PlanViews {
  const org = useOrg(), multi = useIsMulti(), shown = useDisplayScope(), core = useCorePortfolio(), id = useActiveProductId();
  const name = usePortfolio((p) => p.products.find((x) => x.id === id)?.name ?? 'Product');
  return useCtxSelector(useCallback((c: Ctx) => viewsFor(c, name, org, multi, shown, id, core), [name, org, multi, shown, id, core]));
}
