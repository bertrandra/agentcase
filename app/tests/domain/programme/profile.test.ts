import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { headlineOf } from '@/domain/economics/headline';
import { model } from '@/domain/model/overlay';
import { coachingPlan, engineProfile, OPT_INS, programmeLines, type OptInId } from '@/domain/programme';
import { setupBreakdown } from '@/domain/tuneB/setup';
import type { CaseState } from '@/domain/types/state';
import { FIXTURE_IDS, loadCase } from '../../helpers/portfolio';

/**
 * SPEC_BPMN § 19.3, F-B68 (phase B9b): the programme's one monthly cost profile, hand-computed on the golden case (rate card × target location mix:
 * 418 €/day, 220 working days, entry team 15 FTE, setup duration 12 months, horizon 36 months, hub on: setup €90,000 over 30 days).
 */
const RATE = 418, ROLE = RATE * 1.15, WD = 220;
const golden = (): CaseState => loadCase('golden');
const withValues = (s: CaseState, values: Record<string, string>): CaseState => ({ ...s, dom: { ...s.dom, values: { ...s.dom.values, ...values } } });
const amount = (s: CaseState, id: string): number => programmeLines(makeCtx(s)).find((l) => l.id === id)?.amount ?? 0;

describe('the programme cost profile (golden, hand-computed)', () => {
  const c = makeCtx(golden());
  it('training and governance are labour from resources: FTE × months × days per month × role rate (D-B27: the setup duration)', () => {
    expect(amount(golden(), 'training')).toBeCloseTo(0.5 * 12 * (WD / 12) * ROLE, 6);   // 52,877
    expect(amount(golden(), 'governance')).toBeCloseTo(0.25 * 12 * (WD / 12) * ROLE, 6);   // 26,438.5
    expect(amount(withValues(golden(), { trainFte: '1', trainMonths: '6' }), 'training')).toBeCloseTo(1 * 6 * (WD / 12) * ROLE, 6);
  });
  // D-B30 (revised 2026-10-31): coaching days a month × months × the role rate; with no duration entered, the setupCoaching amount calibrates it.
  it('coaching: calibrated from the setup coaching amount (golden €35,000 = 72.81 days = 2 a month × 36.4 months), else days × months × rate', () => {
    const p = coachingPlan(c);
    expect([p.amount, p.perMonth, p.calibrated]).toEqual([35000, 2, true]);
    expect(p.days).toBeCloseTo(35000 / ROLE, 9);
    expect(p.months).toBeCloseTo(35000 / ROLE / 2, 9);   // 36.4, spent over the 36 months of the horizon
    expect(amount(withValues(golden(), { coachDaysPerMonth: '3', coachMonths: '6' }), 'coaching')).toBeCloseTo(3 * 6 * ROLE, 6);   // 8,652.6
    expect(amount(withValues(golden(), { coachDaysPerMonth: '0' }), 'coaching')).toBe(0);
    expect(amount(withValues(golden(), { coachY1: '80', coachCruise: '60' }), 'coaching')).toBe(35000);   // the curve is informative, not priced
    expect(engineNow(c).K.setupProfile[0]! - engineNow(c).K.setupProfile[1]!).toBeCloseTo(90000, 4);   // the hub setup, month 1 only
  });
  it.each(FIXTURE_IDS)('%s: the coaching cost is the case\'s setup coaching amount (no figure moves from coaching itself)', (id) => {
    const s = loadCase(id);
    expect(amount(s, 'coaching')).toBe(makeCtx(s).inp.p('setupCoaching') || 0);
  });
  it('the lines add up to the setup total; tooling, training and governance are spread over 12 months, coaching over 36, the hub over its 30 days', () => {
    const total = 35000 + 0.5 * 12 * (WD / 12) * ROLE + 35000 + 0.25 * 12 * (WD / 12) * ROLE + 90000;   // 239,315.5
    expect(setupBreakdown(c).total).toBeCloseTo(total, 4);
    expect(model(c).setupTotal).toBeCloseTo(total, 4);
    const p = engineNow(c).K.setupProfile, flat = (35000 + 0.5 * 12 * (WD / 12) * ROLE + 0.25 * 12 * (WD / 12) * ROLE) / 12, coach = 35000 / 36;
    expect(p[0]).toBeCloseTo(flat + coach + 90000, 4);   // 100,498.9
    expect(p[11]).toBeCloseTo(flat + coach, 4);   // 10,498.9
    expect(p[12]).toBeCloseTo(coach, 4);   // 972.2
    expect(p[35]).toBeCloseTo(coach, 4);
    expect(headlineOf(engineNow(c), c).setup).toBeCloseTo(total, 4);
  });
});

/** The opt-in activities (D-B31): hand-computed cost of each, switched on alone on golden (days × 418 × 1.15). */
const OPT_DAYS: Record<OptInId, number> = {
  stages: 2 * 12 * (WD / 52) + 5, valueTracking: 0.1 * 36 * (WD / 12), aiAct: (10 * 36) / 12, audit: 10, procurement: 20, integration: 5 * 5,
  hypercare: 1 * 6 * (WD / 52), decommission: 10,
};
describe('opt-in programme activities: off by default, hand-computed when on', () => {
  it.each(FIXTURE_IDS)('%s: no opt-in cost when they are off (no figure moves)', (id) => {
    const c = makeCtx(loadCase(id));
    expect(setupBreakdown(c).optIn).toBe(0);
    expect(programmeLines(c).map((l) => l.id).filter((x) => OPT_INS.some((d) => d.id === x))).toEqual([]);
    expect(engineProfile(c).saving.every((x) => x === 0)).toBe(true);
  });
  it('a parameter entered without the switch moves nothing', () => {
    const s = withValues(golden(), { stagesFte: '9', auditDays: '99', integrations: '40', decomSaving: '5000' });
    expect(engineNow(makeCtx(s)).npv()).toBe(engineNow(makeCtx(golden())).npv());
  });
  it.each(OPT_INS.map((d) => [d.id, d.on] as const))('%s on: its cost = days × role rate, added to the setup and the cash flow', (id, on) => {
    const base = makeCtx(golden()), c = makeCtx(withValues(golden(), { [on]: 'on' })), cost = OPT_DAYS[id] * ROLE;
    expect(amount(withValues(golden(), { [on]: 'on' }), id)).toBeCloseTo(cost, 4);
    expect(setupBreakdown(c).optIn).toBeCloseTo(cost, 4);
    expect(model(c).setupTotal - model(base).setupTotal).toBeCloseTo(cost, 4);
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    expect(sum(engineNow(c).K.setupProfile) - sum(engineNow(base).K.setupProfile)).toBeCloseTo(cost, 4);
    expect(engineNow(c).total()).toBeLessThan(engineNow(base).total());
  });
  it('placement: stages and audit before the build (month 1 of the case\'s cash flow), integration over the setup, decommissioning after it', () => {
    const on = (k: string) => engineProfile(makeCtx(withValues(golden(), { [k]: 'on' }))), base = engineProfile(makeCtx(golden()));
    const delta = (k: string) => on(k).setup.map((x, i) => x - base.setup[i]!);
    const stages = OPT_DAYS.stages * ROLE, m = (12 * 12) / 52;   // 12 weeks of stages = 2.77 months
    expect(delta('optStages').slice(0, 4).map((x) => Math.round(x))).toEqual([stages / m, stages / m, (stages * (m - 2)) / m, 0].map(Math.round));
    expect(delta('optIntegr').slice(0, 13).map((x) => Math.round(x))).toEqual([...Array(12).fill(Math.round((25 * ROLE) / 12)), 0]);
    expect(delta('optDecom').findIndex((x) => x > 0)).toBe(12);   // month 13, the month after the 12-month setup
  });
  it('decommissioning saving: only when entered, from the month after it, in the savings', () => {
    const c = makeCtx(withValues(golden(), { optDecom: 'on', decomSaving: '1000' })), d = makeCtx(withValues(golden(), { optDecom: 'on' }));
    expect(engineProfile(c).saving.reduce((a, x) => a + x, 0)).toBe(23 * 1000);   // months 14..36
    expect(engineNow(c).total() - engineNow(d).total()).toBeCloseTo(23000, 4);
  });
});
