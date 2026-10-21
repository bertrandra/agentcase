import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { convChangeCost, hriCostPerFTE, hriEnabled, hriIndex, hriIntensity, hriRampFactor } from '@/domain/engagement';
import {
  PRODUCT_PROFILES, PROFILE_PHASES, endYear, READINESS_DIMS, abaqueRows, currentProfileId, dimScore, eligVerdict, maturityInfo, maturityMapOf, opModelCompute,
  profileCoef, rampRanges, readinessBand, readinessIndex, vtaxEffBase, vtaxModeOf,
} from '@/domain/tune';
import { vtaxAvgHuman, verificationTaxRate } from '@/domain/model/vtax';
import { caseJson, diff, extra, extraIds } from '../helpers/tuneA';

// Oracle: every figure the six sections derive is compared with the legacy function on every fixture (tools/oracle-extras.d/tuneA.mjs).
const ids = extraIds('tuneAMaturity');
const ctxOf = (id: string) => makeCtx(caseJson(id));
type Ans = Parameters<typeof readinessIndex>[0];

describe('tune A domain reproduces the legacy', () => {
  it('has the extras for every fixture', () => expect(ids.length).toBeGreaterThanOrEqual(55));
  it.each(ids)('maturity map and level: %s', (id) => {
    const c = ctxOf(id), e = extra<{ info: unknown; map: unknown; ranges: string[] }>('tuneAMaturity', id);
    expect(diff(e.info, maturityInfo(c), 'info')).toEqual([]);
    expect(diff(e.map, maturityMapOf(c.s), 'map')).toEqual([]);
    expect(rampRanges(maturityMapOf(c.s).rampBounds)).toEqual(e.ranges);
  });
  it.each(ids)('AI readiness index and bands: %s', (id) => {
    const s = caseJson(id), e = extra<{ idx: number | null; dims: (number | null)[]; bands: string[]; band: string }>('tuneAReadiness', id);
    const ans = (s as unknown as { readinessAns: Ans }).readinessAns;
    expect(readinessIndex(ans)).toEqual(e.idx);
    expect(READINESS_DIMS.map((d) => dimScore(ans, d.key))).toEqual(e.dims);
    expect(READINESS_DIMS.map((d) => readinessBand(dimScore(ans, d.key)).label)).toEqual(e.bands);
    expect(readinessBand(readinessIndex(ans)).label).toBe(e.band);
  });
  it.each(ids)('Human Readiness index, cost and drag: %s', (id) => {
    const c = ctxOf(id), e = extra<Record<string, unknown>>('tuneAHri', id);
    const got = { on: hriEnabled(c), index: hriIndex(c), intensity: hriIntensity(c), costPerFte: hriCostPerFTE(c), change: convChangeCost(c), ramp: hriRampFactor(c) };
    expect(diff(e, got, 'hri')).toEqual([]);
  });
  it.each(ids)('eligibility verdict, pillar matrix and Abaque rows: %s', (id) => {
    const c = ctxOf(id), e = extra<{ pillar: number[][]; profile: string }>('tuneAEligibility', id);
    const got = {
      verdict: eligVerdict(c), abaque: abaqueRows(c), base: vtaxEffBase(c), avgHuman: vtaxAvgHuman(c), mode: vtaxModeOf(c), profile: currentProfileId(c.s.lifecyclePos),
      pillar: PRODUCT_PROFILES.map((p) => PROFILE_PHASES.map((ph) => profileCoef(c, p.id, ph))), vtaxRate: verificationTaxRate(c),
    };
    expect(diff(e, got, 'elig')).toEqual([]);
  });
  it.each(ids)('operating model topology: %s', (id) => {
    const c = ctxOf(id), e = extra<{ y1: unknown; yN: unknown; pods2: number }>('tuneAOpmodel', id);
    const n = endYear(c);
    expect(diff(e.y1, opModelCompute(c, 0), 'y1')).toEqual([]);
    expect(diff(e.yN, opModelCompute(c, n - 1), 'yN')).toEqual([]);
    expect(opModelCompute(c, 2).pods).toBe(e.pods2);
  });
});
