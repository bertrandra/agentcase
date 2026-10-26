import { beforeAll, describe, expect, it } from 'vitest';
import { asisTobeAgg, complianceTable, execTable, kpiAgg, productivityTable, qualityTable, scopeHeadline, consolidate, velocityTable, weightedAutomation,
  weightedVelocity, scheduledProducts, type Portfolio } from '@/domain/portfolio';
import { complianceView, execView, productivityView, qualityAnchorView, velocityView } from '@/domain/verifyB';
import { expectClose } from '../../helpers/portfolio';
import { fourProducts } from '../../helpers/portfolioFixtures';
import { expectCell, independent, scopesOf, shifted as onCalendar, sum } from '../../helpers/aggVerify';

let pf: Portfolio;
beforeAll(() => { pf = fourProducts(); });
const runs = (scopeIds: string[]) => consolidate(pf).products.filter((v) => scopeIds.includes(v.id)).map((v) => v.run);

describe.each([['Portfolio', 0], ['Wave 1', 1], ['Wave 2', 2]] as const)('verify aggregates: performance group, %s', (_name, k) => {
  const scope = () => scopesOf(pf)[k]!, ind = () => independent(pf, scope()), ids = () => ind().map((p) => p.id);

  it('exec: sprint velocity and calendar start of each product; the line is the programme span', () => {
    const t = execTable(pf, scope())!;
    ind().forEach((p, i) => {
      const sp = execView(p.live.c).sprints;
      expectCell(t.rows[i]!.cells.s0, sp[0]![1]); expectCell(t.rows[i]!.cells.s3, sp[3]![1]);
      expect(t.rows[i]!.cells.start).toBeTruthy();
    });
    expect(t.total.start).toBeTruthy(); expect(t.total.s0).toBeNull();
  });

  it('productivity: per-product throughput; the line is the entry-team weighted mean', () => {
    const t = productivityTable(pf, scope())!, w = sum(ind().map((p) => p.live.m.base.etp));
    const asis = (p: ReturnType<typeof ind>[number]) => sum(productivityView(p.live.c).rows.map((r) => r.asis));
    ind().forEach((p, i) => expectCell(t.rows[i]!.cells.asis, asis(p)));
    expectCell(t.total.asis, sum(ind().map((p) => p.live.m.base.etp * asis(p))) / w);
    expectCell(t.total.base, w);
  });

  it('velocity: the uplift line IS weightedVelocity of the selection', () => {
    const t = velocityTable(pf, scope())!;
    ind().forEach((p, i) => expectCell(t.rows[i]!.cells.v3, velocityView(p.live.c).velocity[3]!));
    expectCell(t.total.uplift, weightedVelocity(runs(ids())));
  });

  it('quality: AS-IS → end text per product, overridden anchors counted', () => {
    const t = qualityTable(pf, scope())!;
    ind().forEach((p, i) => {
      const r = qualityAnchorView(p.live.c).rows.find((x) => x.name === 'Test coverage')!;
      expect(t.rows[i]!.cells.cov).toBe(`${r.asis} → ${r.y3}`);
    });
    expect(typeof t.total.edited).toBe('number');
    expect(t.total.cov).toBeNull();
  });

  it('compliance: ceiling per product; the line is the weighted ceiling and the regulatory artifact count', () => {
    const t = complianceTable(pf, scope())!;
    ind().forEach((p, i) => {
      expectCell(t.rows[i]!.cells.ceiling, p.live.m.ceiling);
      expectCell(t.rows[i]!.cells.reg, complianceView(p.live.c).sectors.find((s) => s.selected)!.reg);
    });
    expectCell(t.total.ceiling, weightedAutomation(runs(ids())).ceiling);
    expectCell(t.total.max, 100 - weightedAutomation(runs(ids())).ceiling);
  });

  it('kpi: the financial headline is the scope headline; capacity lines are the products\' sums', () => {
    const a = kpiAgg(pf, scope())!, h = scopeHeadline(consolidate(pf), scope())!.headline, i = ind();
    expect(a.headline).toBe(h);
    expectCell(a.consolidated[0]!.asis, sum(i.map((p) => p.live.m.base.etp)));
    // lot 10: TO-BE headcount = the calendar series at the portfolio horizon end (run team included, a product cut by the horizon counts that month)
    const L = consolidate(pf).horizon, ends = onCalendar(i, L, (r) => r.humanFte + r.runTeamFte, true)[L - 1]!;
    expectCell(a.consolidated[0]!.tobe, ends + sum(i.filter((p) => p.month0 >= L).map((p) => p.live.m.base.etp)));
    expectCell(a.consolidated[1]!.asis, sum(i.map((p) => p.live.m.baselineRun)));
    expectCell(a.consolidated[3]!.tobe, h.eff);
    expectCell(a.table.total.after, a.consolidated[0]!.tobe as number);
    i.forEach((p, n) => expectCell(a.table.rows[n]!.cells.run0, p.live.m.baselineRun));
  });

  it('asis-tobe: reference vs TO-BE cost is the portfolio cost reduction; lines add up to it', () => {
    const a = asisTobeAgg(pf, scope())!, cr = scopeHeadline(consolidate(pf), scope())!.headline.costReduction;
    expectCell(a.rows[1]!.asis, cr.base); expectCell(a.rows[1]!.tobe, cr.tobe); expectCell(a.rows[2]!.tobe, cr.setup);
    expectCell(a.table.total.cost0, sum(a.table.rows.map((r) => +(r.cells.cost0 ?? 0))));
    expectCell(a.table.total.cost1, sum(a.table.rows.map((r) => +(r.cells.cost1 ?? 0))));
    expectCell(a.table.total.setup, sum(a.table.rows.map((r) => +(r.cells.setup ?? 0))));
    expectClose(a.years, cr.years);
  });
});

describe('verify aggregates: performance group, edge cases', () => {
  it('unknown wave: no view; an unscheduled product leaves every table; Wave 2 holds one product', () => {
    expect(kpiAgg(pf, { kind: 'wave', id: 'x' })).toBeNull();
    expect(scheduledProducts(pf)).toHaveLength(3);
    expect(execTable(pf, { kind: 'portfolio' })!.rows).toHaveLength(3);
    expect(velocityTable(pf, { kind: 'wave', id: pf.waves[1]!.id })!.rows).toHaveLength(1);
  });
});
