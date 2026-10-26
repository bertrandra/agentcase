import { beforeAll, describe, expect, it } from 'vitest';
import { agentDetailTable, agentDirTable, consolidate, phaseArtTable, usageAgg, type Portfolio } from '@/domain/portfolio';
import { AGENT_CATALOG, agentDetail, agentDirectory, agentUsage, artifactRuns, rolesForPhase, supMatrix } from '@/domain/verifyA';
import { expectClose } from '../../helpers/portfolio';
import { fourProducts } from '../../helpers/portfolioFixtures';
import { expectCell, independent, scopesOf, shifted, sum } from '../../helpers/aggVerify';

let pf: Portfolio;
beforeAll(() => { pf = fourProducts(); });

describe.each([['Portfolio', 0], ['Wave 1', 1], ['Wave 2', 2]] as const)('verify aggregates: agents group, %s', (_name, k) => {
  const scope = () => scopesOf(pf)[k]!;

  it('agent-usage: calendar token / infra cost are the products\' months shifted; phases and levels add up', () => {
    const a = usageAgg(pf, scope())!, ind = independent(pf, scope()), L = consolidate(pf).horizon, us = ind.map((p) => agentUsage(p.live));
    const tok = shifted(ind, L, (r) => r.tokenCost);
    a.years.forEach((y, i) => expectClose(y.tokenCost, sum(tok.slice(12 * i, 12 * i + 12))));
    const vf = shifted(ind, L, (r) => r.agentVfte);
    a.years.forEach((y, i) => expectClose(y.vfte, vf[Math.min(12 * i + 11, L - 1)]!));
    for (const ph of a.phases) expectClose(ph.effort, sum(us.flatMap((u) => u.phases.filter((p) => p.id === ph.id).map((p) => p.effort))));
    for (const l of a.auth) expectClose(l.n, sum(us.map((u) => u.auth.find((x) => x.level === l.level)!.n)));
    expectClose(sum(a.auth.map((l) => l.share)), 100);
  });

  it('agent-usage: each product line is its own usage; the total line is their sum', () => {
    const a = usageAgg(pf, scope())!, ind = independent(pf, scope());
    ind.forEach((p, i) => {
      const s = agentUsage(p.live).summary, c = a.table.rows[i]!.cells;
      expectCell(c.vfte, s.vfte); expectCell(c.tokenCost, s.tokenCost); expectCell(c.tokensM, s.tokensM); expectCell(c.count, s.count);
      expectCell(c.runs, artifactRuns(p.live).totals.total);
    });
    expectCell(a.table.total.runs, sum(ind.map((p) => artifactRuns(p.live).totals.total)));
    expectCell(a.table.total.tokenCost, sum(ind.map((p) => agentUsage(p.live).summary.tokenCost)));
  });

  it('agent-dir: levels per product, the line counts each agent and role once', () => {
    const t = agentDirTable(pf, scope())!, ind = independent(pf, scope());
    ind.forEach((p, i) => { expectCell(t.rows[i]!.cells.agents, agentDirectory(p.live.c, 'ALL').length); expectCell(t.rows[i]!.cells.roles,
      rolesForPhase(p.live.c, 'ALL').length); });
    expectCell(t.total.agents, AGENT_CATALOG.length);
    expectCell(t.total.roles, new Set(ind.flatMap((p) => rolesForPhase(p.live.c, 'ALL'))).size);
    expect(t.total.avgSup).toBeNull();
  });

  it('agent-detail: run FTE, supervision and authorization counts add up', () => {
    const t = agentDetailTable(pf, scope())!, ind = independent(pf, scope()), ds = ind.map((p) => agentDetail(p.live));
    expectCell(t.total.run, sum(ds.map((d) => d.runTotal)));
    expectCell(t.total.sup, sum(ds.map((d) => d.supETP)));
    expectCell(t.total.l1, sum(ds.map((d) => d.auth[1]!.count)));
    ds.forEach((d, i) => { expectCell(t.rows[i]!.cells.rate, d.runRate); expectCell(t.rows[i]!.cells.run, d.runTotal); });
    expect(t.total.rate).toBeNull();
  });

  it('phase-art: scope per product, floor violations and artifacts add up', () => {
    const t = phaseArtTable(pf, scope())!, ind = independent(pf, scope()), sups = ind.map((p) => supMatrix(p.live));
    expectCell(t.total.arts, sum(sups.map((s) => sum(s.map((r) => r.n)))));
    expectCell(t.total.viol, sum(sups.map((s) => s.filter((r) => r.gap < 0).length)));
    sups.forEach((s, i) => expectCell(t.rows[i]!.cells.margin, Math.round(Math.min(...s.map((r) => r.gap)))));
  });
});

describe('verify aggregates: agents group, edge cases', () => {
  it('unknown wave: no view; the unscheduled product is excluded', () => {
    expect(usageAgg(pf, { kind: 'wave', id: 'x' })).toBeNull();
    expect(phaseArtTable(pf, { kind: 'portfolio' })!.rows.map((r) => r.name)).not.toContain('Archive (no wave)');
  });
});
