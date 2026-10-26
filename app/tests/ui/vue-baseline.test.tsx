// @vitest-environment jsdom
import { vi } from 'vitest';
import { aggregateTeams, baselineLocStrat } from '@/domain/portfolio';
import { fmtRange } from '@/ui/sections/aggregates/AggregateParts';
import { describeAggregates } from '../helpers/aggUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

describeAggregates('baseline', [
  { id: 'team-in', title: /Input team/, table: /Entry teams by product/, expected: (pf, ids) => {
    const a = aggregateTeams(pf, ids);
    return { rows: a.products.map((r) => ({ id: r.id, cells: [r.etp.toFixed(2), String(r.lines)] })), total: [a.total.toFixed(2)] };
  } },
  { id: 'loc-strat', title: /Location strategy/, table: /Location strategy by product/, expected: (pf, ids) => {
    const a = baselineLocStrat(pf, ids);
    return { rows: a.rows.map((r) =>
      ({ id: r.id, cells: [r.fte.toFixed(1), `€${Math.round(r.asisTJM)}`, `€${Math.round(r.targetTJM)}`, r.gap, r.own ? 'own mix' : 'derived from AS-IS'] })),
      total: [a.fte.toFixed(1), fmtRange(a.localTarget, 0, '%'), fmtRange(a.offshoreTarget, 0, '%')] };
  } },
], [{ id: 'ratecard', title: /Rate Card/ }]);
