// @vitest-environment jsdom
import { vi } from 'vitest';
import { scopeLifecycle, scopeParams, scopePhases, scopeScurve, scopeSelection } from '@/domain/portfolio';
import { fmtRange } from '@/ui/sections/aggregates/AggregateParts';
import { describeAggregates } from '../helpers/aggUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

describeAggregates('scope', [
  { id: 'params', title: /Automation & Glass ceiling/, table: /Automation and glass ceiling by product/, expected: (pf, ids) => {
    const a = scopeParams(pf, ids);
    return { rows: a.rows.map((r) =>
      ({ id: r.id, cells: [`${r.potential.toFixed(0)}%`, `${r.ceiling.toFixed(0)}%`, `${r.effective.toFixed(0)}%`, r.forced ? 'forced' : 'computed'] })),
      total: [fmtRange(a.potential, 0, '%'), fmtRange(a.ceiling, 0, '%'), fmtRange(a.effective, 0, '%')] };
  } },
  { id: 'scurve', title: /S-curve — adoption ramp/, table: /Adoption curve by product/, expected: (pf, ids) => {
    const a = scopeScurve(pf, ids);
    return { rows: a.rows.map((r) => ({ id: r.id, cells: [r.family, `${r.y1}%`, `${r.y2}%`, `${r.endAdoption}% (${r.endMaturity})`] })),
      total: [fmtRange(a.endAdoption, 0, '%')] };
  } },
  { id: 'scope-sel', title: /Scope — target artifact selection/, table: /Artefact selection by product/, expected: (pf, ids) => {
    const a = scopeSelection(pf, ids);
    return { rows: a.rows.map((r) => ({ id: r.id, cells: [`${r.sdlc}/${r.sdlcTotal}`, r.own ? 'own selection' : 'inherited'] })),
      total: [String(a.total.sdlc), String(a.total.reg)] };
  } },
  { id: 'phase-scope', title: /Phase scope/, table: /Phase scope by product/, expected: (pf, ids) => {
    const a = scopePhases(pf, ids), first = a.phases[0]!.id;
    return { rows: a.rows.map((r) => ({ id: r.id, cells: [`${r.selected}/${r.total}`, r.cells[first]!.state === 'none' ? 'out' : 'in'] })),
      total: [`${a.productsIn[first]}/${ids.length} products`] };
  } },
  { id: 'lc-weighting', title: /Product status lifecycle weighting/, table: /Lifecycle weighting by product/, expected: (pf, ids) => {
    const a = scopeLifecycle(pf, ids);
    return { rows: a.rows.map((r) => ({ id: r.id, cells: [r.use ? 'on' : 'off (neutral)', `×${r.posture.toFixed(2)}`] })),
      total: [`${a.using}/${ids.length} on`] };
  } },
]);
