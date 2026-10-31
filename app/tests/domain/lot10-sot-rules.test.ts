import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { engineNow, makeCtx, model, type CaseState } from '@/domain';
import { AUTH_LEVELS, AUTH_ORDER, authRank } from '@/domain/authority';
import { fitPotential } from '@/domain/inputs';
import { noProgramme } from '../helpers/legacyProgramme';
import { blendedDayRate } from '@/domain/location';
import { levelLabelFor, rampBoundsOf, RAMP_BOUNDS_DEFAULT } from '@/domain/maturityBounds';
import { driftRows } from '@/domain/model/cbdView';
import { capacityRows } from '@/domain/model/supView';
import { cmRecommend, CM_RULE, mcConfidenceOf } from '@/domain/pdc/commercial';
import { storySummary } from '@/domain/pdc/story';
import { VARIABLES } from '@/domain/pdc/variables';
import { automationCurve } from '@/domain/scope/automation';
import { scurveView } from '@/domain/scope/scurveView';
import { histogramBins } from '@/domain/stress';
import { taxExplain } from '@/domain/tune';
import { maturityMapOf } from '@/domain/tune/maturity';
import { decisionContext } from '@/domain/verdict/context';
import { maturityMap } from '@/domain/verifyA';

/** The new rules of the lot 10 "one source of truth" deviations (docs/DEVIATIONS.md), continued: the moved rules and their single owners. */
const load = (id: string) => makeCtx(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState);
const get = (id: string, c: ReturnType<typeof makeCtx>) => VARIABLES.find((v) => v.id === id)!.get(c);

describe('DEV-VTAX-CAP: the explanation applies the model cap', () => {
  it('tuneA-elig-nogo (cap 0.5): rates within COEF.vtaxCap, € at the horizon end, one tax per horizon year', () => {
    const c = load('tuneA-elig-nogo'), t = taxExplain(c);
    expect(t.cap).toBe(0.5);
    expect(Math.max(t.rateOverlay, t.rateNet)).toBeLessThanOrEqual(0.5);
    expect(t.eurOverlay).toBeCloseTo(t.gross * t.rateOverlay, 6);
    expect(t.yearly).toHaveLength(engineNow(c).horizonYears);
    expect(t.endLabel).toBe(`Y${engineNow(c).horizonYears}`);
  });
});

describe('DEV-MATURITY-BOUNDS: one owner of the L1–L4 bounds', () => {
  it('tuneA-maturity-bounds (0/40/60/70): the S-curve readout, bands and legend follow the case bounds', () => {
    const c = load('tuneA-maturity-bounds'), b = rampBoundsOf(c.s), v = scurveView(c, engineNow(c).horizonMonths);
    expect(b).toEqual([0, 40, 60, 70]);
    expect(v.endMaturity).toBe(levelLabelFor(v.endAdoption, b));
    expect(v.bands.map((x) => x[0])).toEqual(b);
    expect(v.grid).toEqual([...b, 100]);
    expect(automationCurve(c).levelsLabel).toBe('40 / 60 / 70%');
    expect(maturityMap(c)).toEqual(maturityMapOf(c.s));
  });
  it('the default bounds are the shipped map', () => expect(rampBoundsOf({})).toEqual([...RAMP_BOUNDS_DEFAULT]));
});

describe('DEV-GLASS-CEILING-OWNER: the registry and the decision context read the computed ceiling', () => {
  it('golden', () => {
    const c = load('golden'), ceil = model(c).ceiling;
    expect(get('glassCeilingPct', c)).toBe(ceil);
    expect(get('maxAutomatablePct', c)).toBe(100 - ceil);
    expect(decisionContext(c).find((l) => l.k === 'Glass ceiling')!.v).toBe(`${Math.round(ceil)}%`);
  });
});

describe('DEV-CM-CONFIDENCE: the commercial recommendation reads the Monte Carlo confidence', () => {
  it('an MSC case moves to gain sharing from the confidence threshold', () => {
    const c = load('golden');
    expect(cmRecommend(c)[0]).toBe('AGS');
    expect(cmRecommend(c, CM_RULE.mscConfidence)[0]).toBe('GS');
    expect(mcConfidenceOf({ stats: { pNetNeg: 0.1 } })).toBeCloseTo(0.9, 9);
    expect(mcConfidenceOf(null)).toBeNull();
  });
});

describe('single owners of the moved figures (no deviation)', () => {
  it('drift rows read the engine years (= the overlay arrays at horizon 3) and cover the horizon', () => {
    for (const id of ['cbd-on', 'horizon-5']) {
      const c = load(id), rows = driftRows(c), ys = engineNow(c).years(), m = model(c);
      expect(rows.map((r) => r.gross)).toEqual(ys.map((y) => y.savings));
      if (ys.length === 3) rows.forEach((r, i) => expect(r.attributable).toBeCloseTo(m.cbd.yearSavAttributable[i]!, 6));
    }
  });
  it('capacity rows cover the horizon from the engine', () => {
    const c = load('horizon-5');
    expect(capacityRows(c).map((r) => r.label)).toEqual(['Y1', 'Y2', 'Y3', 'Y4', 'Y5']);
  });
  it('the story payback is the displayed payback; the blended rate has one owner; the fit rule; the AI authority order', () => {
    // B9b: no setup = no programme cost (noProgramme: the resource lines zeroed too)
    expect(storySummary(makeCtx(noProgramme(JSON.parse(readFileSync('fixtures/cases/econ-no-setup.json', 'utf8')) as CaseState))).payback).toBe(0);
    const c = load('golden');
    expect(blendedDayRate(c.s, c.inp)).toBe(model(c).blendedTJM);
    expect([fitPotential(83.6, 100), fitPotential(83.6, 60), fitPotential(-2, 100)]).toEqual([84, 60, 0]);
    expect(AUTH_LEVELS.map(authRank)).toEqual([1, 2, 3, 4]);
    expect(authRank('unknown')).toBe(1);
    expect(Object.keys(AUTH_ORDER)).toEqual([...AUTH_LEVELS]);
  });
  it('the histogram bins add up to the draws and flag the bins below zero', () => {
    const bins = histogramBins([-10, -5, 0, 5, 10, 20]);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(6);
    expect(bins[0]!.negative).toBe(true);
    expect(bins.at(-1)!.negative).toBe(false);
  });
});
