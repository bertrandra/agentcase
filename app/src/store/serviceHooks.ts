/** @calc-zone portfolio-consolidation */
import { useMemo } from 'react';
import { consolidate, serviceLoad, servicesView, type ServiceLoad, type ServiceView } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope, type ViewScope } from './viewScope';

const NO_CALENDAR: ReadonlyMap<string, number> = new Map();

/**
 * The Services view (docs/SPEC_BPMN.md § 21 F-B82, phase B10c): every shared service with what it delivers, its FTE and cost by product
 * (`servicesView`, memoised on the core portfolio), and the View the screen follows (Product, Wave, Unit or Portfolio: the products it shows).
 */
export function useServices(): { views: ServiceView[]; scope: ViewScope } {
  const core = useCorePortfolio(), scope = useViewScope();
  const views = useMemo(() => servicesView(core), [core]);
  return { views, scope };
}

/** A service's load against its capacity, month by month, over the products of the View (the B9d histogram's engine months). */
export function useServiceLoad(view: ServiceView, scope: Pick<ViewScope, 'kind' | 'productIds'>): ServiceLoad {
  const core = useCorePortfolio(), { kind, productIds } = scope;
  return useMemo(() => serviceLoad(core, kind === 'product' ? NO_CALENDAR : new Map(consolidate(core).products.map((v) => [v.id, v.month0])), view,
    productIds), [core, kind, view, productIds]);
}
