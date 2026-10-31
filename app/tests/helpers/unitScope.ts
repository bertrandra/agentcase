import { addOrgUnit, setProductOwner } from '@/controllers/org';
import { corePortfolio, type Portfolio } from '@/domain/portfolio';
import { EMPTY_HISTORY } from '@/store/history';
import { threeProducts, type Three } from './portfolioStore';

/**
 * Three products in two waves (`threeProducts`: A and B in wave 1, C in wave 2) and a unit tree four levels deep (F-B81, B10b):
 *   bu (business unit) → d1 (department) → d2 (sub-department); bu → d3; and `empty`, a root that owns nothing.
 * A is owned by d2, B by d3 (so wave 1 spans two units), C has no owner ("Unassigned").
 */
export interface UnitThree extends Three { pf: () => Portfolio }
export function unitTreeThree(): UnitThree {
  const t = threeProducts(), [a, b] = t.ids;
  addOrgUnit({ id: 'bu', name: 'Retail BU', type: 'businessUnit' });
  addOrgUnit({ id: 'd1', name: 'Payments', type: 'department', parent: 'bu' });
  addOrgUnit({ id: 'd2', name: 'Cards', type: 'department', parent: 'd1' });
  addOrgUnit({ id: 'd3', name: 'Lending', type: 'department', parent: 'bu' });
  addOrgUnit({ id: 'empty', name: 'Research', type: 'department' });
  setProductOwner(a, 'd2'); setProductOwner(b, 'd3');
  t.s.setHistory(EMPTY_HISTORY);
  return { ...t, pf: () => corePortfolio(t.s.getState().portfolio) };
}
