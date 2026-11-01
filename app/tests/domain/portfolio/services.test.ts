import { describe, expect, it } from 'vitest';
import { setServiceRoles, setServiceSkills, setSharedLineSplit, setSharedLineUnit } from '@/controllers/services';
import { setSharedPins, setSharedShare } from '@/controllers/sharedTeam';
import { addOrgUnit, setActivityRaci, setProductOwner } from '@/controllers/org';
import { teamInCost } from '@/domain/location';
import { portfolioReportData } from '@/store/persistence/report/portfolio/data';
import {
  consolidate, costModel, effectiveTeam, groupOf, lineRule, lineShares, ownRows, productTeam, resolveProduct, runOf, scopeHeadline, serviceDeliveries,
  servicesView, sharedLines, type Portfolio,
} from '@/domain/portfolio';
import { ctxOf } from '@/domain/portfolio/memo';
import { withLines } from '@/domain/portfolio/sharedTeam';
import { expectClose } from '../../helpers/portfolio';
import { serviceThree } from '../../helpers/services';

/**
 * F-B82 / D-B38 (docs/SPEC_BPMN.md § 21, phase B10c): a shared service is assigned activities across products (pins, activity type, RACI
 * Responsible role); the cost of its lines is split by the effort of those activities for each product, or by fixed shares (the override).
 * The allocations are hand-computed below; Σ allocations = the service's cost.
 */
const line0 = (pf: Portfolio) => sharedLines(pf)[0]!;
const acts = (pf: Portfolio, i: number): string[] => serviceDeliveries(pf)[0]!.products[i]!.activities.map((a) => a.id);
const RATE_C1_FRANCE_YEAR = 149_600;   // the fresh case's C1 · France day rate × its working days: one FTE for a year

describe('assignment: what a service does for each product (one owner, org/services.ts)', () => {
  it('by activity type: every active Test/QA activity of each product (B left A023 out of its scope)', () => {
    const t = serviceThree(), pf = t.pf();
    expect([acts(pf, 0), acts(pf, 1), acts(pf, 2)]).toEqual([['A022', 'A023', 'A025'], ['A022', 'A025'], ['A022', 'A023', 'A025']]);
    expect(serviceDeliveries(pf)[0]!.products.map((p) => p.effort.toFixed(9))).toEqual(['15.600000000', '7.200000000', '15.600000000']);
  });
  it('by pins and by RACI Responsible role, on top of the type; the reason of each is kept', () => {
    const t = serviceThree();
    setSharedPins(t.line, ['A017'], true);
    expect(serviceDeliveries(t.pf())[0]!.products[0]!.activities.find((a) => a.id === 'A017')!.via).toEqual(['pin']);
    setServiceSkills('qa', []);
    expect(acts(t.pf(), 0)).toEqual(['A017']);
    expect(setActivityRaci('A018', { R: ['role-qa'], A: 'role-lead', C: [], I: [] })).toBe(true);
    expect(setServiceRoles('qa', ['role-qa'])).toBe(true);
    expect(serviceDeliveries(t.pf())[0]!.products[0]!.activities.map((x) => [x.id, x.via])).toEqual([['A017', ['pin']], ['A018', ['role']]]);
  });
});

describe('cost allocation by effort (D-B38 a), hand-computed', () => {
  it('3 FTE split 15.6 : 7.2 : 15.6 → 40.625 % / 18.75 % / 40.625 %; FTE 1.21875 / 0.5625 / 1.21875; cost at 149,600 € per FTE', () => {
    const t = serviceThree(), pf = t.pf(), [a, b, c] = t.ids, sh = lineShares(pf, line0(pf));
    expect(lineRule(pf, line0(pf))).toBe('effort');
    expectClose(sh[a]!, 40.625); expectClose(sh[b]!, 18.75); expectClose(sh[c]!, 40.625);
    const v = servicesView(pf)[0]!, by = (id: string) => v.products.find((p) => p.productId === id)!;
    expectClose(by(a).fte, 1.21875); expectClose(by(b).fte, 0.5625); expectClose(by(c).fte, 1.21875);
    expectClose(by(a).cost, 182_325); expectClose(by(b).cost, 84_150); expectClose(by(c).cost, 182_325);
    expectClose(v.cost, 3 * RATE_C1_FRANCE_YEAR);
    expectClose(by(a).cost + by(b).cost + by(c).cost, v.cost);   // Σ allocations = the service's cost
    expect(v.lines[0]!.unallocatedPct).toBeCloseTo(0, 9);
  });
  it('the product\'s entry team carries the share row: own rows, then the line at FTE × share (the engine reads it)', () => {
    const t = serviceThree(), pf = t.pf(), b = t.ids[1], team = resolveProduct(pf, b).teamIn;
    expect(ownRows(team)).toEqual(productTeam(pf, b));
    expect(team.at(-1)).toMatchObject({ skill: 'Test/QA', grade: 'C1', loc: 'France', shared: t.line });
    expectClose(team.at(-1)!.etp, 0.5625);
  });
  it('an archived product is served nothing; no assigned activity anywhere: no share', () => {
    const t = serviceThree();
    setServiceSkills('qa', []);
    expect(lineShares(t.pf(), line0(t.pf()))).toEqual({});
    expect(effectiveTeam(t.pf(), t.pf().products[0]!)).toBe(productTeam(t.pf(), t.ids[0]));
  });
});

describe('fixed shares (D-B38 b, the override) and the migration rule', () => {
  it('switching to fixed seeds the shares with the effort split (to 0.01 %); back to effort restores it', () => {
    const t = serviceThree(), [a, b] = t.ids;
    expect(setSharedLineSplit(t.line, 'fixed')).toBe(true);
    expect(line0(t.pf()).allocations).toEqual({ [a]: 40.63, [b]: 18.75, [t.ids[2]]: 40.63 });
    expect(lineRule(t.pf(), line0(t.pf()))).toBe('fixed');
    setSharedShare(t.line, b, 50);
    expect(lineShares(t.pf(), line0(t.pf()))[b]).toBe(50);
    expect(setSharedLineSplit(t.line, 'effort')).toBe(true);
    expectClose(lineShares(t.pf(), line0(t.pf()))[b]!, 18.75);
  });
  it('a line holding shares that joins a service keeps them as its override: the figures do not move', () => {
    const t = serviceThree(), [a, b] = t.ids;
    expect(setSharedLineUnit(t.line, null)).toBe(true);
    expect(line0(t.pf())).not.toHaveProperty('split');
    setSharedShare(t.line, a, 70); setSharedShare(t.line, b, 30);
    const before = t.ids.map((id) => resolveProduct(t.pf(), id).teamIn);
    expect(setSharedLineUnit(t.line, 'qa')).toBe(true);
    expect(line0(t.pf())).toMatchObject({ unit: 'qa', allocations: { [a]: 70, [b]: 30 } });
    expect(lineRule(t.pf(), line0(t.pf()))).toBe('fixed');
    // FX-D3 (a): the shares (FTE) are kept; the service's Test/QA activities are routed to its line (pins) — and no headline figure moves
    const after = t.ids.map((id) => resolveProduct(t.pf(), id).teamIn);
    expect(after.map((rows) => rows.map((r) => r.etp))).toEqual(before.map((rows) => rows.map((r) => r.etp)));
    expect(after[0]!.find((r) => r.shared)!.pins!.length).toBeGreaterThan(0);
  });
  it('effort outside a service is refused; a line outside a service is always split by its fixed shares', () => {
    const t = serviceThree();
    setSharedLineUnit(t.line, null);
    expect(setSharedLineSplit(t.line, 'effort')).toBe(false);
    expect(lineRule(t.pf(), line0(t.pf()))).toBe('fixed');
  });
});

describe('cross-surface: an effort split flows through the very path of fixed shares', () => {
  it('the same portfolio with the effort split written as fixed shares: identical teams, figures, unit roll-ups, cost model and report', () => {
    const t = serviceThree();
    addOrgUnit({ id: 'bu', name: 'Retail BU', type: 'businessUnit' }); setProductOwner(t.ids[0], 'bu'); setProductOwner(t.ids[1], 'bu');
    const pf = t.pf(), sh = lineShares(pf, line0(pf));
    const fixed = withLines(pf, sharedLines(pf).map(({ split: _s, ...l }) => { void _s; return { ...l, allocations: sh }; }));
    expect(lineRule(fixed, line0(fixed))).toBe('fixed');
    for (const id of t.ids) {
      expect(resolveProduct(fixed, id).teamIn).toStrictEqual(resolveProduct(pf, id).teamIn);
      expect(runOf(resolveProduct(fixed, id)).headline()).toEqual(runOf(resolveProduct(pf, id)).headline());
      const c = ctxOf(resolveProduct(pf, id)), own = teamInCost({ ...c.s, teamIn: ownRows(c.s.teamIn) }, c.inp).cost;
      expectClose(servicesView(pf)[0]!.products.find((p) => p.productId === id)!.cost, teamInCost(c.s, c.inp).cost - own);   // the product's figure
    }
    const [k, kf] = [consolidate(pf), consolidate(fixed)], bu = { kind: 'unit', id: 'bu' } as const, all = { kind: 'portfolio' } as const;
    expect(kf.summary).toEqual(k.summary); expect(kf.baseEtp).toBe(k.baseEtp);
    expect(scopeHeadline(kf, bu)).toEqual(scopeHeadline(k, bu));
    expect(groupOf(kf, bu)!.summary).toEqual(groupOf(k, bu)!.summary);
    expect(costModel(fixed, bu).values).toEqual(costModel(pf, bu).values);
    const now = new Date(0);
    expect(portfolioReportData(fixed, all, now)!.productRows).toEqual(portfolioReportData(pf, all, now)!.productRows);
    const v = servicesView(pf)[0]!;
    expectClose(v.products.reduce((a, p) => a + p.cost, 0), v.cost);   // Σ allocations = service cost
    expectClose(groupOf(k, bu)!.items.reduce((a, x) => a + x.run.baseEtp, 0), scopeHeadline(k, bu)!.headline.fte.before);
  });
});
