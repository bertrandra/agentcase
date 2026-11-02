import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { hriDaysPerFTE, hriIntensity } from '@/domain/engagement';
import { khRunAnnual } from '@/domain/knowledge';
import { AI_SKILL_PREMIUM } from '@/domain/rates';
import DEFAULT_DOC from '@/store/defaults/defaultDoc.json';
import { teamInCost } from '@/domain/location';
import { runMcs } from '@/domain/model/mcs';
import { coachingPlan, engineProfile, programmeLines } from '@/domain/programme';
import { programmeHistogram, histogramLabourCost } from '@/domain/programme/histogram';
import { hubSetupTiming } from '@/domain/programme/timing';
import { calendar } from '@/domain/programme/sizing';
import type { CaseState } from '@/domain/types/state';
import { loadCase } from '../../helpers/portfolio';

/**
 * The normalisation of the programme's sizing (docs/PROGRAMME_SIZING_DMN.md, owner's decisions 2026-11-02), hand-computed on the golden case
 * (418 €/day, role rate × 1.15, 220 working days, horizon 36 months, hub on). docs/DEVIATIONS.md, the normalisation entries.
 */
const WD = 220, RATE = 418, ROLE = RATE * AI_SKILL_PREMIUM;
const golden = () => loadCase('golden');
function withValues(s: CaseState, v: Record<string, string>): CaseState { return { ...s, dom: { ...s.dom, values: { ...s.dom.values, ...v } } }; }
const lineOf = (s: CaseState, id: string) => programmeLines(makeCtx(s)).find((l) => l.id === id);

describe('normalisation of the programme sizing', () => {
  it('#1 the pilot is a programme line at the role rate, in the euro result, before the build', () => {
    const p = lineOf(golden(), 'pilot')!, days = 3 * (16 / 52) * WD;
    expect(p.effortDays).toBeCloseTo(days, 9);
    expect(p.amount).toBeCloseTo(days * ROLE, 6);
    expect(p.from).toBeLessThanOrEqual(0);
    const c = makeCtx(golden()), all = programmeLines(c).reduce((a, l) => a + l.amount, 0);
    expect(engineProfile(c).setup.reduce((a, x) => a + x, 0)).toBeCloseTo(all, 4);   // every line, the pilot included, reaches the engine
    expect(histogramLabourCost(programmeHistogram(c), false)).toBeCloseTo(0, 6);   // no labour outside the euro result any more
  });
  it('#2 one calendar: the hub setup lasts its working days', () => {
    expect(calendar(220).daysToMonths(30)).toBeCloseTo(30 / (220 / 12), 9);
    expect(hubSetupTiming(makeCtx(golden())).months).toBeCloseTo(30 * 12 / WD, 9);
  });
  it('#3 coaching has an explicit pricing mode; without one, an amount and no duration keeps the legacy total', () => {
    expect(coachingPlan(makeCtx(golden()))).toMatchObject({ pricing: 'amount', amount: 35000 });
    const r = coachingPlan(makeCtx(withValues(golden(), { coachPricing: 'resources' })));
    expect([r.pricing, r.months]).toEqual(['resources', 12]);
    expect(r.amount).toBeCloseTo(2 * 12 * ROLE, 6);
    const a = coachingPlan(makeCtx(withValues(golden(), { coachPricing: 'amount', coachMonths: '6' })));
    expect([a.amount, a.months, a.days]).toEqual([35000, 6, 0]);
  });
  it('#4 change management: entry FTE × days per head of the band × the role rate', () => {
    const s = golden(), on: CaseState = { ...s, dom: { ...s.dom, checked: { ...s.dom.checked, hriEnabled: true } } }, c = makeCtx(on);
    const days = ({ light: 2.5, standard: 6, intensive: 11.5 } as const)[hriIntensity(c)];
    expect(hriDaysPerFTE(c)).toBe(days);
    expect(lineOf(on, 'change')!.amount).toBeCloseTo(teamInCost(c.s, c.inp).etp * days * ROLE, 6);
    expect(lineOf(golden(), 'change')).toBeUndefined();   // HRI off: no line
  });
  it('#7 the decommissioning saving is an output of its line, read by the engine', () => {
    const ds = withValues(golden(), { optDecom: 'on', decomSaving: '1000' }), l = lineOf(ds, 'decommission')!;
    expect(l.saving?.perMonth).toBe(1000);
    const sv = engineProfile(makeCtx(ds)).saving;
    expect(sv.slice(l.saving!.from - 1).every((x) => x === 1000)).toBe(true);
    expect(sv.slice(0, l.saving!.from - 1).every((x) => x === 0)).toBe(true);
  });
  it('#8 the hub curation is priced at the role rate in a new case; a case saved before keeps the TJM until it opts in', () => {
    const s = golden(), on: CaseState = { ...s, COEF: { ...s.COEF, khCurationPremium: AI_SKILL_PREMIUM } };
    expect(khRunAnnual(makeCtx(on), RATE, WD)).toBeCloseTo(0.5 * ROLE * WD + 2500 * 12, 6);
    expect(khRunAnnual(makeCtx(s), RATE, WD)).toBeCloseTo(0.5 * RATE * WD + 2500 * 12, 6);   // the saved golden case: no coefficient
    expect((DEFAULT_DOC as { COEF: Record<string, number> }).COEF.khCurationPremium).toBe(AI_SKILL_PREMIUM);   // every new case
  });
  it('#9 the programme amounts draw only when their spread is set; off, the Monte Carlo is unchanged', () => {
    const s = golden(), base = runMcs(makeCtx(s), 100, 7);
    const on: CaseState = { ...s, MODEL: { ...s.MODEL, MCS: { ...(s.MODEL as { MCS?: object }).MCS, dists: { programmeAmount: { spreadPct: 20 } } } } as CaseState['MODEL'] };
    const r = runMcs(makeCtx(on), 100, 7);
    expect(r.stats.savY3).toEqual(base.stats.savY3);   // amounts are setup: the end-year savings do not move
    expect(r.stats.npv).not.toEqual(base.stats.npv);
    expect(r.tornado.some((t) => t.id === 'programmeAmount')).toBe(true);
    expect(base.tornado.some((t) => t.id === 'programmeAmount')).toBe(false);
  });
});
