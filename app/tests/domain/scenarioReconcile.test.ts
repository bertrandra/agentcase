import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { engineNow, makeCtx, type CaseState, type Ctx } from '@/domain';
import { headline } from '@/domain/economics/headline';
import { cumAt, scenarioSet, withInputs, type Scenario } from '@/domain/stress';

const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const load = (id: string) => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;
const CURVES = ['spline.default', 'logistic.default', 'gompertz.default', 'bass.default', 'legacy.linearAnchor', 'legacy.flatAnnual'];
const withCurve = (s: CaseState, curve: string): CaseState => ({ ...s, scurve: { ...s.scurve, curve } });
const by = (c: Ctx, key: Scenario['key']) => scenarioSet(c).find((x) => x.key === key)!.m;

/** DEV-SCENARIO-ENGINE: the scenario that mirrors the main case's configuration returns exactly the main case figures. */
function expectMirror(c: Ctx) {
  const a = by(c, 'ailoc'), h = headline(c), ys = engineNow(c).years();
  expect([a.net, a.roi, a.pbMonth, a.pbYear, a.npv, a.totBen, a.setup]).toEqual([h.net, h.roi, h.paybackMonth, h.paybackYear, h.npv, h.totalBenefit, h.setup]);
  expect(a.horizon).toBe(engineNow(c).horizonYears);
  expect(a.yearSav).toEqual(ys.map((y) => y.savings));
  expect(a.yearRun).toEqual(ys.map((y) => y.totalRunCost));
  expect(a.cum[a.horizon * 12]).toBe(engineNow(c).cumulativeAt(a.horizon * 12));
}

describe("'AI + Location' is the main case (DEV-SCENARIO-ENGINE)", () => {
  it.each(ids)('%s: net, ROI, payback month and year, NPV and the per-year savings and run cost are the headline\'s, exactly', (id) => {
    expectMirror(makeCtx(load(id)));
  });
  describe.each(['golden', 'curve-logistic', 'curve-legacy', 'horizon-5', 'industry-med'])('%s', (id) => {
    it.each(CURVES.flatMap((curve) => [1, 2, 3, 4, 6].map((h) => [curve, h] as const)))('curve %s, horizon %i', (curve, h) => {
      expectMirror(withInputs(makeCtx(withCurve(load(id), curve)), { horizon: String(h) }));
    });
  });
  // B9b (the B9b deviations): the setup is the programme's cost profile (€239,315.5 on golden, spent over its activities' months); the benefit is unchanged.
  it('golden, default curve: benefit, setup, ROI and payback read the headline (before DEV-SCENARIO-ENGINE: €135,000, ROI 16.9, month 4; before B9b: '
    + '€225,000, ROI 7.1, month 9)', () => {
    const a = by(makeCtx(load('golden')), 'ailoc');
    expect([a.setup, Math.round(a.net), Math.round(a.totBen)]).toEqual([239315.5, 1589603, 1828919]);
    expect(a.roi).toBeCloseTo(6.642, 3);
    expect(a.pbMonth).toBe(6);
  });
});

describe('the other scenarios run the same engine with their levers', () => {
  const sets = ids.map((id) => [id, makeCtx(load(id))] as const);
  it.each(sets)('%s: AS-IS is the baseline (no saving, no setup); the cumulative series ends at the net and crosses 0 at the payback month', (_id, c) => {
    const S = scenarioSet(c), asis = S.find((s) => s.key === 'asis')!.m;
    expect(asis.setup).toBe(0);
    asis.yearSav.forEach((v) => expect(Math.abs(v)).toBeLessThan(1e-6 * Math.max(1, asis.baselineRun)));
    S.forEach((s) => {
      const m = s.m, n = m.horizon * 12;
      expect(m.yearSav).toHaveLength(m.horizon);
      expect(m.yearRun).toHaveLength(m.horizon);
      expect(m.totBen - m.setup).toBeCloseTo(m.net, 6);
      expect(cumAt(m, 0)).toBe(0);
      expect(cumAt(m, n)).toBeCloseTo(m.net, 4);
      expect(cumAt(m, n + 6)).toBe(cumAt(m, n));
      if (m.pbMonth != null) {
        expect(cumAt(m, m.pbMonth)).toBeGreaterThanOrEqual(0);
        if (m.pbMonth > 1) expect(cumAt(m, m.pbMonth - 1)).toBeLessThan(0);
      } else expect(cumAt(m, n)).toBeLessThan(0);
    });
  });
  it.each(sets)('%s: setup only where a programme exists; AI scenarios carry the case setup; AI only and AI + 100 % destination share the engine', (_id, c) => {
    const S = scenarioSet(c), m = (k: Scenario['key']) => S.find((s) => s.key === k)!.m, setup = headline(c).setup;
    expect([m('asis').setup, m('loc').setup]).toEqual([0, 0]);
    expect([m('ai').setup, m('ramp').setup, m('ailoc').setup, m('aidst').setup]).toEqual([setup, setup, setup, setup]);
    // AI only and AI + 100 % destination differ by the day rate alone
    if (Math.abs(m('aidst').tgtRateTJM - m('ai').asisTJM) < 1e-9) expect(m('aidst').yearSav).toEqual(m('ai').yearSav);
  });
  it.each(sets)('%s: the cheaper the location, the better (monotone in the day rate)', (_id, c) => {
    const S = scenarioSet(c), m = (k: Scenario['key']) => S.find((s) => s.key === k)!.m, e = 1e-6;
    const cheaper = m('loc').tgtTJM <= m('loc').asisTJM;
    if (cheaper) {
      expect(m('loc').totBen).toBeGreaterThanOrEqual(-e);
      expect(m('ailoc').totBen).toBeGreaterThanOrEqual(m('ai').totBen - e);
    } else {
      expect(m('loc').totBen).toBeLessThanOrEqual(e);
      expect(m('ailoc').totBen).toBeLessThanOrEqual(m('ai').totBen + e);
    }
  });
  it('the ramp scenario moves from the AS-IS to the destination rate: more relocation per year, more (or equal) saving when the destination is cheaper', () => {
    const c = makeCtx(load('golden')), tot = (fr: number) => scenarioSetAt(c, fr).totBen;
    const m0 = tot(0), m1 = tot(25), m2 = tot(100);
    expect(Math.abs(m0)).toBeLessThan(1e-6 * by(c, 'asis').baselineRun);
    const cheaper = by(c, 'ramp').tgtRateTJM <= by(c, 'ramp').asisTJM;
    expect(cheaper ? m1 >= m0 - 1e-6 && m2 >= m1 - 1e-6 : m1 <= m0 + 1e-6 && m2 <= m1 + 1e-6).toBe(true);
  });
});

function scenarioSetAt(c: Ctx, fr: number) {
  return by(withInputs(c, { scenFrPerYear: String(fr) }), 'ramp');
}
