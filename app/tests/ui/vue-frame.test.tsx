// @vitest-environment jsdom
import { vi } from 'vitest';
import { frameEngage, frameEngagement, frameIndustry } from '@/domain/portfolio';
import { fmtRange } from '@/ui/sections/aggregates/AggregateParts';
import { describeAggregates } from '../helpers/aggUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

describeAggregates('frame', [
  { id: 'engagement-context', title: /Engagement context/, table: /Engagement context by product/, expected: (pf, ids) => {
    const a = frameEngagement(pf, ids);
    return { rows: a.rows.map((r) =>
      ({ id: r.id, cells: [r.label, `${Math.round(r.setupBillable * 100)}%`, `L${r.maturityCap}`, r.own ? 'own context' : 'inherited from common'] })),
      total: a.contexts.map((c) => `${c.count} ${c.key}`) };
  } },
  { id: 'engage', title: /Engage — starting early with the client/, table: /Onboarding runway by product/, expected: (pf, ids) => {
    const a = frameEngage(pf, ids);
    return { rows: a.rows.map((r) => ({ id: r.id, cells: [`${r.totalWeeks} wk`, r.decide, r.pilotStart, String(r.weeks[0])] })),
      total: [fmtRange(a.totalWeeks, 0, ' wk'), a.earliestDecide, a.latestDecide] };
  } },
  { id: 'transform-params', title: /Industry \/ regulatory profile/, table: /Industry profile by product/, expected: (pf, ids) => {
    const a = frameIndustry(pf, ids);
    return { rows: a.rows.map((r) => ({ id: r.id, cells: [r.label, r.regUse ? 'on' : 'off', String(r.regArtefacts), `${r.regCeiling.toFixed(0)}%`] })),
      total: [`${a.regulated} regulated`] };
  } },
], [{ id: 'home', title: /Welcome|AgentCase/ }]);
