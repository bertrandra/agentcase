import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeCase, engineNow, makeCtx, type CaseState } from '@/domain';
import { costReduction } from '@/domain/economics/costReduction';
import { displayedPayback, paybackMonthOf } from '@/domain/economics/cashflow';
import { headline, headlineOf, paybackYearShown } from '@/domain/economics/headline';
import { caseHorizonYears, clampHorizonYears } from '@/domain/inputs';
import { evlModel } from '@/domain/model/evidence';
import { horizonYears } from '@/domain/model/horizonYears';
import { VARIABLES } from '@/domain/pdc/variables';
import { isSplitComplete, SPLIT_TOLERANCE, splitRemainder, splitTotal } from '@/domain/split';
import { mcOutcome, runMonteCarlo, scenarioSet, sensitivityMatrix, MC_PARAMS_DEFAULT } from '@/domain/stress';
import { cellCtx } from '@/domain/stress/sensitivity';
import { evaluateStrategies, stratNormalize, stratWeightsOf } from '@/domain/verdict';
import { noProgramme } from '../helpers/legacyProgramme';
import { FIXTURE_IDS, loadCase } from '../helpers/portfolio';

const ctx = (id: string) => makeCtx(loadCase(id));
/** econ-no-setup without a programme cost under the B9b rules (DEV-B9B-COACHING / -RESOURCES: the resource lines zeroed too). */
const noSetup = () => makeCtx(noProgramme(loadCase('econ-no-setup')));
const withCurve = (s: CaseState, curve: string): CaseState => ({ ...s, scurve: { ...s.scurve, curve } } as CaseState);
const withValues = (s: CaseState, v: Record<string, string>): CaseState => ({ ...s, dom: { ...s.dom, values: { ...s.dom.values, ...v } } });
/** The same case with no uncertainty: every draw is the deterministic case. */
const still = (s: CaseState): CaseState => ({ ...s, mcParams: MC_PARAMS_DEFAULT.map((p) => ({ ...p, spread: 0 })) } as CaseState);

describe('DEV-LEGACY-CURVE-HORIZON: the legacy curves read the Time Engine over the whole horizon', () => {
  it.each(['legacy.flatAnnual', 'legacy.linearAnchor'])('%s, horizon-5: Monte Carlo outcome, horizonYears and costReduction follow the headline', (curve) => {
    const c = makeCtx(withCurve(loadCase('horizon-5'), curve)), h = headline(c), hy = horizonYears(c);
    expect(hy.sav).toHaveLength(5);
    expect(mcOutcome(c)).toBeCloseTo(h.net, 6);   // was 1,989,307 (3 years) against a headline of 4,117,251 under flatAnnual
    expect(hy.sav.reduce((a, b) => a + b, 0)).toBeCloseTo(h.totalBenefit, 6);
    expect(costReduction(c).years).toBe(5);
  });
  it('zero variance: every draw of the legacy curve is the headline net (P50 = net)', () => {
    const c = makeCtx(still(withCurve(loadCase('horizon-5'), 'legacy.flatAnnual'))), r = runMonteCarlo(c, 50, 42);
    expect(r.stats.p50).toBeCloseTo(headline(c).net, 6);
    expect(r.stats.p10).toBeCloseTo(r.stats.p90, 6);
  });
});

describe('DEV-SENS-RERUN: each matrix cell reruns the engine', () => {
  it('a cell is the headline ROI of the case with the moved potential and ceiling (all 20 cells)', () => {
    const c = ctx('golden'), m = sensitivityMatrix(c), cell = cellCtx(c, 35, 30);
    expect(m.cells[1]![4]!.roi).toBe(headlineOf(engineNow(cell), cell).roi);
    m.autos.forEach((a, i) => m.ceils.forEach((ce, j) => { const x = cellCtx(c, a, ce); expect(m.cells[i]![j]!.roi).toBe(headlineOf(engineNow(x), x).roi); }));
  });
  it('a heavy setup turns cells negative (the legacy scaling never changed sign); a zero potential gives no Infinity', () => {
    const heavy = makeCtx(withValues(loadCase('golden'), { setupTooling: '6000000' })), m = sensitivityMatrix(heavy);
    expect(m.cells.flat().some((x) => x.roi! < 0 && x.warn && x.text.includes('⚠️'))).toBe(true);
    const zero = sensitivityMatrix(makeCtx(withValues(loadCase('golden'), { autoPotential: '0' })));
    expect(zero.cells.flat().every((x) => x.roi === null || Number.isFinite(x.roi))).toBe(true);
    expect(zero.cells.flat().some((x) => x.text.includes('Infinity'))).toBe(false);
  });
});

describe('DEV-PAYBACK-RECOVERY: payback after the last negative cumulative month', () => {
  it('no single-product payback changes on the 107 fixtures (their cumulative never dips again after it crosses 0)', () => {
    for (const id of FIXTURE_IDS) {
      const e = engineNow(ctx(id)), cum = Array.from({ length: e.horizonMonths }, (_, i) => e.cumulativeAt(i + 1)), first = cum.findIndex((x) => x >= 0);
      expect(e.payback(), id).toBe(first < 0 ? null : first + 1);
      expect(paybackMonthOf(cum), id).toBe(e.payback());
    }
  });
});

describe('DEV-PAYBACK-NOSETUP: one displayed payback', () => {
  it('owner rule: immediate (0) with no setup and savings, null with no setup and no saving, else the kernel month', () => {
    expect([displayedPayback(1, 0, 10), displayedPayback(1, 0, 0), displayedPayback(9, 5, 10), displayedPayback(null, 5, 10)]).toEqual([0, null, 9, null]);
  });
  it('the scenarios, the Financial view, Results and the strategies all say immediate on econ-no-setup; the KPI kernel month stays 1', () => {
    const c = noSetup(), h = headline(c);
    expect(h.paybackMonth).toBe(1);
    expect(paybackYearShown(h)).toBe(0);
    const loc = scenarioSet(c).find((s) => s.key === 'loc')!.m;
    expect(displayedPayback(loc.pbMonth, loc.setup, loc.totBen)).toBe(0);
    const rows = evaluateStrategies(c), saving = rows.filter((r) => r.computed.setup === 0 && r.computed.net > 0);
    expect(saving.length).toBeGreaterThan(0);
    for (const r of saving) expect(r.computed.payback).toBe(0);
  });
  it('the ranking puts an immediate payback first on that metric (it was ranked as 99 years)', () => {
    const c = noSetup(), ranked = stratNormalize(evaluateStrategies(c), stratWeightsOf(c.s));
    for (const r of ranked) expect(r.norm.payback).toBe(r.row.computed.payback === 0 ? 100 : 0);
  });
});

describe('one horizon reader, one headline owner, horizon-sized years', () => {
  it('clampHorizonYears: whole years in 1..10, 3 when empty or not a number', () => {
    expect(['0', '-1', '25', 'abc', '', '4.7', '5', null, undefined, 7].map(clampHorizonYears)).toEqual([1, 1, 10, 3, 3, 4, 5, 3, 3, 7]);
    expect(caseHorizonYears(makeCtx(withValues(loadCase('golden'), { horizon: '-1' })).inp)).toBe(1);
  });
  it.each(['0', '-1'])('horizon "%s" read from a file does not throw and equals a 1-year case', (raw) => {
    const odd = computeCase(withValues(loadCase('golden'), { horizon: raw })), one = computeCase(withValues(loadCase('golden'), { horizon: '1' }));
    expect(odd.model.horizon).toBe(1);
    expect(odd.headline).toEqual(one.headline);
  });
  it('headlineOf reads the engine totals: net = total(), ROI = roi()', () => {
    for (const id of ['golden', 'horizon-5', 'econ-no-setup', 'horizon-1']) {
      const e = engineNow(ctx(id)), h = headline(ctx(id));
      expect(h.net).toBe(e.total()); expect(h.roi).toBe(e.roi());
    }
  });
  it('DEV-YEAR-BEYOND-HORIZON: "Net savings Y2" and "Run cost, Y2" are n/a on a 1-year case, the Y2 figure otherwise', () => {
    const v = (id: string, c: ReturnType<typeof ctx>) => VARIABLES.find((x) => x.id === id)!.get(c);
    expect([v('netSavY2', ctx('horizon-1')), v('runCostY2', ctx('horizon-1'))]).toEqual([null, null]);
    expect(v('netSavY2', ctx('horizon-2'))).toBe(engineNow(ctx('horizon-2')).year(2).savings);
  });
  it('the scenario run-cost total is a domain figure (totRun), the sum of its year rows', () => {
    for (const s of scenarioSet(ctx('horizon-5'))) expect(s.m.totRun).toBeCloseTo(s.m.yearRun.reduce((a, b) => a + b, 0), 6);
  });
});

describe('evidence ledger: the evaluation date is an argument, never the clock', () => {
  afterEach(() => { vi.useRealTimers(); });
  const dated = (asOf: string): CaseState => {
    const s = loadCase('me-mcs'), M = s.MODEL as unknown as { EVIDENCE: { drivers: Record<string, { asOf: string }> } };
    return { ...s, MODEL: { ...s.MODEL, EVIDENCE: { ...M.EVIDENCE, drivers: { ...M.EVIDENCE.drivers, p: { ...M.EVIDENCE.drivers.p!, asOf } } } } } as CaseState;
  };
  it('the same file gives the same grade whatever the wall clock; the age rule follows the date passed', () => {
    const c = makeCtx(dated('2025-01-01')), at = Date.parse('2025-06-01'), late = Date.parse('2027-12-01');
    vi.useFakeTimers(); vi.setSystemTime(new Date('2020-01-01'));
    const a = evlModel(c, null, at);
    vi.setSystemTime(new Date('2040-01-01'));
    expect(evlModel(c, null, at)).toEqual(a);
    expect(a.drivers.find((d) => d.id === 'p')!.effectiveTier).toBe('MEASURED');
    expect(evlModel(c, null, late).drivers.find((d) => d.id === 'p')!.effectiveTier).toBe('BENCHMARK');
    expect(evlModel(c, null, null).drivers.find((d) => d.id === 'p')!.effectiveTier).toBe('MEASURED');   // undated: no age rule
  });
});

describe('one "adds up to 100 %" rule (DEV-SPLIT-TOLERANCE)', () => {
  it('total, remainder and completeness with one tolerance', () => {
    expect(SPLIT_TOLERANCE).toBe(0.5);
    expect(splitTotal([33.333, '33.333', 33.333, undefined, 'x'])).toBeCloseTo(99.999, 9);
    expect(splitRemainder(90)).toBe(10);
    expect([isSplitComplete(99.999), isSplitComplete(100.4), isSplitComplete(99.5), isSplitComplete(101)]).toEqual([true, true, false, false]);
  });
});
