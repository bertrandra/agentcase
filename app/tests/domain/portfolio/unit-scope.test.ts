import { describe, expect, it } from 'vitest';
import { setProductOwner } from '@/controllers/org';
import { setDisplayScope } from '@/controllers/displayScope';
import {
  aggregateAnnual, aggregateRun, asisTobeAgg, consolidate, consolidationView, corePortfolio, costModel, groupOf, kpiAgg, portfolioHeadline, runStats,
  scopeExists, scopeHeadline, scopeMembers, selectionView, UNASSIGNED_UNIT, type GroupScope,
} from '@/domain/portfolio';
import { portfolioReportData } from '@/store/persistence/report/portfolio/data';
import { viewScopeOf } from '@/store/viewScope';
import { expectClose, expectSeriesClose } from '../../helpers/portfolio';
import { unitTreeThree } from '../../helpers/unitScope';

/**
 * F-B81 (docs/SPEC_BPMN.md § 21, phase B10b): a Unit of the organisation tree, at any level, is a display scope that aggregates the products it owns
 * directly or through its sub-units exactly as a Wave aggregates its products — one owner of "a set of products" (`groupOf`).
 */
const unit = (id: string): GroupScope => ({ kind: 'unit', id });
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

describe('Unit scope: members over the tree (any depth, Unassigned, empty, unknown)', () => {
  it('a unit holds the products of its sub-units; Unassigned the rest; an empty unit none; an unknown unit does not exist', () => {
    const t = unitTreeThree(), pf = t.pf(), [a, b, c] = t.ids;
    expect(scopeMembers(pf, unit('bu'))!.planned).toEqual([a, b]);
    expect(scopeMembers(pf, unit('d1'))!.planned).toEqual([a]);
    expect(scopeMembers(pf, unit('d2'))!.planned).toEqual([a]);
    expect(scopeMembers(pf, unit('d3'))!.planned).toEqual([b]);
    expect(scopeMembers(pf, unit(UNASSIGNED_UNIT))).toMatchObject({ label: 'Unassigned', planned: [c] });
    expect(scopeMembers(pf, unit('empty'))).toEqual({ label: 'Research', planned: [], excluded: [] });
    expect(scopeMembers(pf, unit('nope'))).toBeNull();
    expect(scopeExists(pf, unit('nope'))).toBe(false);
    expect(scopeExists(pf, unit('unit-delivery'))).toBe(true);   // the derived default delivery unit is a node too
    expect(viewScopeOf(pf, unit('d1'), a)).toMatchObject({ kind: 'unit', label: 'Payments', unitId: 'd1', productIds: [a] });
  });
});

describe('Unit scope: cross-surface — the unit totals are the sum of its products', () => {
  it.each(['bu', 'd1', 'd3', UNASSIGNED_UNIT])('unit "%s": series, headline, selection, roll-ups', (id) => {
    const t = unitTreeThree(), pf = t.pf(), c = consolidate(pf), g = groupOf(c, unit(id))!, mine = g.items;
    expect(mine.length).toBeGreaterThan(0);
    for (const k of ['net', 'run', 'setup', 'humanFte', 'agentVfte'] as const) {
      expectSeriesClose(g.series[k], c.series[k].map((_, i) => sum(mine.map((v) => v.series[k][i] ?? 0))));
    }
    const h = scopeHeadline(c, unit(id))!.headline;
    expectClose(h.npv, sum(mine.map((v) => v.summary.npv))); expectClose(h.net, sum(mine.map((v) => v.summary.net)));
    expectClose(h.setup, sum(mine.map((v) => v.summary.setup))); expect(h.products).toBe(mine.length);
    expectClose(h.fte.before, sum(mine.map((v) => v.run.baseEtp)));
    const sel = selectionView(pf, c, unit(id))!;
    expect(sel.rows.map((r) => r.id)).toEqual(mine.map((v) => v.id));
    expectClose(sel.totals.net, sum(sel.rows.map((r) => r.net))); expectClose(sel.totals.run, sum(sel.rows.map((r) => r.run)));
    const run = aggregateRun(pf, c, unit(id))!, kpi = kpiAgg(pf, unit(id))!;
    expect(run).toBeTruthy(); expect(kpi).toBeTruthy();
    expectClose(sum(aggregateAnnual(pf, c, unit(id))!.years.map((y) => y.net)), h.net);
  });

  it('waves stay independent: wave 1 spans two units, and the units split it', () => {
    const t = unitTreeThree(), c = consolidate(t.pf()), w1 = groupOf(c, { kind: 'wave', id: t.waves[0] })!;
    const parts = [groupOf(c, unit('d1'))!, groupOf(c, unit('d3'))!];
    expectClose(w1.summary.net, sum(parts.map((p) => p.summary.net)));
    expectSeriesClose(w1.series.net, w1.series.net.map((_, i) => sum(parts.map((p) => p.series.net[i] ?? 0))));
  });
});

describe('Unit scope: a unit owning every product gives the Portfolio figures exactly', () => {
  it('headline, selection, roll-ups, plan-free exports and report', () => {
    const t = unitTreeThree();
    setProductOwner(t.ids[2], 'd3');
    const pf = t.pf(), c = consolidate(pf), bu = unit('bu'), all = { kind: 'portfolio' } as const;
    expect(scopeHeadline(c, bu)!.headline).toEqual(portfolioHeadline(c));
    const u = selectionView(pf, c, bu)!, p = selectionView(pf, c, all)!;
    expect(u.rows).toEqual(p.rows); expect(u.years).toEqual(p.years);
    expect({ ...u.totals, id: '', name: '' }).toEqual({ ...p.totals, id: '', name: '' });
    expect(u.chart.series.slice(1)).toEqual(p.chart.series.slice(1)); expect(u.chart.series[0]!.data).toEqual(p.chart.series[0]!.data);
    expect(aggregateRun(pf, c, bu)).toEqual({ ...aggregateRun(pf, c, all), label: 'Retail BU' });
    expect(kpiAgg(pf, bu)).toEqual({ ...kpiAgg(pf, all), label: 'Retail BU' });
    expect(asisTobeAgg(pf, bu)).toEqual({ ...asisTobeAgg(pf, all), label: 'Retail BU' });
    const cu = costModel(pf, bu), cp = costModel(pf, { kind: 'portfolio' });
    expect(cu.values).toEqual(cp.values); expect(cu.other).toEqual(cp.other);
    const now = new Date(0), ru = portfolioReportData(pf, bu, now)!, rp = portfolioReportData(pf, all, now)!;
    expect(ru.headline).toEqual(rp.headline); expect(ru.productRows).toEqual(rp.productRows); expect(ru.years).toEqual(rp.years);
    expect(ru.kind).toBe('unit'); expect(ru.label).toBe('Retail BU');
  });
});

describe('Unit scope: the empty state and the per-product memo', () => {
  it('an empty unit has no planned product: zero flows, no rows, no export', () => {
    const t = unitTreeThree(), pf = t.pf(), c = consolidate(pf), g = groupOf(c, unit('empty'))!;
    expect(g.items).toEqual([]); expect(g.summary.net).toBe(0); expect(g.summary.paybackMonth).toBeNull();
    expect(selectionView(pf, c, unit('empty'))!.rows).toEqual([]);
    expect(() => costModel(pf, unit('empty'))).toThrow(/no planned product/);
    expect(consolidationView(pf, c).products).toHaveLength(3);
  });

  it('switching to any unit scope recomputes nothing: same core, same consolidation, no engine built', () => {
    const t = unitTreeThree(), core = t.pf(), c = consolidate(core), builds = runStats.builds;
    for (const id of ['bu', 'd1', 'd2', 'd3', 'empty', UNASSIGNED_UNIT]) {
      expect(setDisplayScope(unit(id))).toBe(true);
      const now = corePortfolio(t.s.getState().portfolio);
      expect(now).toBe(core); expect(consolidate(now)).toBe(c);
      expect(selectionView(now, c, unit(id))).toBe(selectionView(now, c, unit(id)));
    }
    expect(setDisplayScope(unit('nope'))).toBe(false);
    expect(runStats.builds).toBe(builds);
    expect(t.s.getState().history.undo).toHaveLength(0);   // view state: no undo step
  });
});
