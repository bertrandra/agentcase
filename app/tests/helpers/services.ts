import { addOrgUnit } from '@/controllers/org';
import { setActiveProduct, setEditScope } from '@/controllers/product';
import { toggleArtefact } from '@/controllers/scope';
import { addServiceLine, setServiceSkills, setUnitService } from '@/controllers/services';
import { updateSharedLine } from '@/controllers/sharedTeam';
import { corePortfolio, type Portfolio } from '@/domain/portfolio';
import { EMPTY_HISTORY } from '@/store/history';
import { threeProducts, type Three } from './portfolioStore';

/**
 * Three products (`threeProducts`: A and B in wave 1, C in wave 2) served by one shared service (F-B82, phase B10c): unit `qa` "QA service", marked
 * shared service, activity type Test/QA, one line Test/QA · C1 · France · 3 FTE split by effort (D-B38). B's own process leaves A023 out of its scope.
 * The fresh case's active Test/QA activities and their weights (effort × lifecycle weight 1.2 of phase V4): A022 4.8, A023 8.4, A025 2.4; so the
 * service's effort is 15.6 for A and C, and 4.8 + 2.4 = 7.2 for B.
 */
export interface ServiceThree extends Three { line: string; pf: () => Portfolio }
export function serviceThree(): ServiceThree {
  const t = threeProducts(), [a, b] = t.ids;
  addOrgUnit({ id: 'qa', name: 'QA service', type: 'centreOfExcellence' });
  setUnitService('qa', true); setServiceSkills('qa', ['Test/QA']);
  const line = addServiceLine('qa', 'Test/QA')!;
  updateSharedLine(line, 'etp', 3);
  setActiveProduct(b); setEditScope('product'); toggleArtefact('A023', false); setEditScope('all'); setActiveProduct(a);
  t.s.setHistory(EMPTY_HISTORY);
  return { ...t, line, pf: () => corePortfolio(t.s.getState().portfolio) };
}
