import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeCtx, model, type CaseState } from '@/domain';
import { headline } from '@/domain/economics/headline';
import { roiCanonical } from '@/domain/economics/roi';
import { scenarioSet } from '@/domain/stress';

const load = (id: string) => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;
const flat = (s: CaseState): CaseState => ({ ...s, scurve: { ...s.scurve, curve: 'legacy.flatAnnual' } });
const ailoc = (s: CaseState) => { const c = makeCtx(s); return { c, m: model(c), a: scenarioSet(c).find((x) => x.key === 'ailoc')!.m }; };

describe("'AI + Location' scenario reconciles to the main case (DEV-SCENARIO-FLAT)", () => {
  // The scenario model is the flat annual model: the year-end team size is held for the whole year. On the legacy flat curve the main case
  // is the same maths plus the overlays the scenario does not carry, so the two reconcile to the euro.
  it.each(['curve-legacy', 'golden', 'kh-off', 'baseline-pins-med'])('%s on the flat curve: yearSav, setup and ROI reconcile through the overlays', (id) => {
    const { c, m, a } = ailoc(flat(load(id)));
    m.yearSav.forEach((v, i) => {
      const overlays = -(m.conv.khRunYr[i] as number) + (m.conv.ktAvoidYr[i] as number) - (m.conv.vTaxYr[i] as number) - (m.conv.loopExtYr[i] as number);
      expect(v).toBeCloseTo((a.yearSav[i] as number) + overlays, 4);
    });
    expect(m.setupTotal - a.setup).toBeCloseTo(m.conv.changeCost + m.conv.khSetup, 4);
    const net = m.yearSav.reduce((x, y) => x + y, 0) - m.setupTotal, h = headline(c);
    expect(h.net).toBeCloseTo(net, 4);
    expect(h.roi).toBeCloseTo(roiCanonical(net, m.setupTotal) as number, 9);
    expect(a.roi).toBeCloseTo(roiCanonical(a.totBen - a.setup, a.setup) as number, 9);
    // the scenario carries less setup and no knowledge-hub run cost: its ROI can only be at least as good. Payback is not comparable on this
    // curve: the scenario pays the whole setup up front (cumulative starts at -setup) whereas the engine spreads it over six months.
    if (a.roi != null && h.roi != null) expect(a.roi).toBeGreaterThanOrEqual(h.roi - 1e-9);
  });
  // On the real adoption curve the engine ramps month by month, the flat scenario does not: it overstates the early years. Pinned on the
  // golden case so a change of either model is noticed; the bands are the documented tolerance (see docs/DEVIATIONS.md).
  it('golden on the default curve: the flat scenario overstates benefit by 32 % and pays back 5 months earlier (documented gap)', () => {
    const { c, a } = ailoc(load('golden')), h = headline(c);
    expect(a.totBen / h.totalBenefit - 1).toBeCloseTo(0.324, 2);
    expect(a.roi).toBeCloseTo(16.93, 2);
    expect(h.roi).toBeCloseTo(7.13, 2);
    expect([a.pbMonth, h.paybackMonth]).toEqual([4, 9]);
  });
  it.each(['golden', 'curve-logistic', 'ctx-msi', 'industry-med'])('%s: the flat scenario stays an upper bound within 70 % of the engine benefit', (id) => {
    const { c, a } = ailoc(load(id)), h = headline(c), gap = a.totBen / h.totalBenefit - 1;
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(0.7);
    expect(a.pbMonth).toBeLessThanOrEqual(h.paybackMonth as number);
  });
});
