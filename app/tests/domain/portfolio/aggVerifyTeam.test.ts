import { beforeAll, describe, expect, it } from 'vitest';
import { consolidate, fteVfteAgg, targetTeamAgg, tobeTeamAgg, vfteOvTable, type Portfolio } from '@/domain/portfolio';
import { fteSummary, groupRows, locRows, periodRows, targetTeam, tobeComposition } from '@/domain/verifyA';
import { expectClose, expectSeriesClose } from '../../helpers/portfolio';
import { fourProducts } from '../../helpers/portfolioFixtures';
import { expectCell, independent, scopesOf, shifted, sum } from '../../helpers/aggVerify';

let pf: Portfolio;
beforeAll(() => { pf = fourProducts(); });

describe.each([['Portfolio', 0], ['Wave 1', 1], ['Wave 2', 2]] as const)('verify aggregates: team group, %s', (_name, k) => {
  const scope = () => scopesOf(pf)[k]!;

  it(`fte-vfte: the calendar trajectory is the products' own months shifted`, () => {
    const a = fteVfteAgg(pf, scope())!, ind = independent(pf, scope()), L = consolidate(pf).horizon;
    expectSeriesClose(a.chart.human, shifted(ind, L, (r) => r.humanFte));
    expectSeriesClose(a.chart.agent, shifted(ind, L, (r) => r.agentVfte));
    const h = shifted(ind, L, (r) => r.humanFte);
    a.years.forEach((y, i) => { expectClose(y.human, h[Math.min(12 * i + 11, L - 1)]!); expectClose(y.total, y.human + y.agent); });
    expect(a.table.rows.map((r) => r.id)).toEqual(ind.map((p) => p.id));
  });

  it(`fte-vfte: each product line is its own horizon-end split, the total line adds them up`, () => {
    const a = fteVfteAgg(pf, scope())!, ind = independent(pf, scope());
    ind.forEach((p, i) => {
      const s = fteSummary(p.live), cells = a.table.rows[i]!.cells;
      expectCell(cells.base, p.live.m.base.etp); expectCell(cells.agent, s.agent); expectCell(cells.total, s.total); expectCell(cells.freed, s.freed);
    });
    expectCell(a.table.total.base, sum(ind.map((p) => p.live.m.base.etp)));
    expectCell(a.table.total.agent, sum(ind.map((p) => fteSummary(p.live).agent)));
    expectCell(a.table.total.total, sum(ind.map((p) => fteSummary(p.live).total)));
  });

  it(`vfte-ov: the horizon-end composition of each product`, () => {
    const t = vfteOvTable(pf, scope())!, ind = independent(pf, scope());
    ind.forEach((p, i) => { const last = periodRows(p.live).at(-1)!; expectCell(t.rows[i]!.cells.human, last.human); expectCell(t.rows[i]!.cells.agent, last.agent); expectCell(t.rows[i]!.cells.ramp, last.ramp); });
    expectCell(t.total.human, sum(ind.map((p) => periodRows(p.live).at(-1)!.human)));
    expectCell(t.total.freed, sum(ind.map((p) => periodRows(p.live).at(-1)!.freed)));
    expect(t.total.ramp).toBeNull();
  });

  it(`team-out: poles, locations and the cost add up over the products`, () => {
    const a = targetTeamAgg(pf, scope())!, ind = independent(pf, scope()), ts = ind.map((p) => targetTeam(p.live));
    expectCell(a.table.total.dev, sum(ts.map((t) => t.devETP)));
    expectCell(a.table.total.recurring, sum(ts.map((t) => t.totalRecurrent)));
    expectCell(a.table.total.setup, sum(ts.map((t) => t.setupETP)));
    a.groups.forEach((g, i) => {
      expectClose(g.fte, sum(ind.map((p, j) => groupRows(p.live, ts[j]!)[i]!.fte)));
      expectClose(g.cost, sum(ind.map((p, j) => groupRows(p.live, ts[j]!)[i]!.cost)));
    });
    expectClose(a.groupsTotal.cost, sum(a.groups.map((g) => g.cost)));
    a.locs.forEach((r, i) => expectClose(r.tgtFte, sum(ind.map((p, j) => locRows(p.live, ts[j]!)[i]!.tgtFte))));
    expectClose(a.locsTotal.tgtFte, sum(ts.map((t) => t.devETP + t.supETP + t.runETP)));
  });

  it.each([0, 2, 5])(`tobe-team: the skills add up over the products for year index %i`, (year) => {
    const a = tobeTeamAgg(pf, scope(), year)!, ind = independent(pf, scope()), comps = ind.map((p) => tobeComposition(p.live, year));
    expectClose(a.total.human, sum(comps.map((c) => c.tot.human)));
    expectClose(a.total.agent, sum(comps.map((c) => c.tot.agent)));
    expectClose(a.total.asis, sum(comps.map((c) => c.tot.asis)));
    for (const s of a.skills) expectClose(s.human, sum(comps.flatMap((c) => c.rows.filter((r) => r.skill === s.skill).map((r) => r.perYear[Math.min(a.year, c.years.length - 1)]!.human))));
    expectClose(sum(a.skills.map((s) => s.human)), a.total.human);
    expect(a.year).toBeLessThan(a.years);
  });
});

describe('verify aggregates: selection edge cases', () => {
  it('an unknown wave has no view; the unscheduled product is in no table', () => {
    expect(fteVfteAgg(pf, { kind: 'wave', id: 'nope' })).toBeNull();
    const names = fteVfteAgg(pf, { kind: 'portfolio' })!.table.rows.map((r) => r.name);
    expect(names).toEqual(['Product 1', 'Payroll', 'Billing']);
    expect(targetTeamAgg(pf, { kind: 'wave', id: pf.waves[1]!.id })!.table.rows).toHaveLength(1);
  });
});
