import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { headlineOf } from '@/domain/economics/headline';
import { activityType, costProfileKey, engineProfile, lineOfKind, LINE_PROFILES, PROGRAMME_ACTIVITIES, programmeLines, spreadMonths } from '@/domain/programme';
import { scurveView } from '@/domain/scope/scurveView';
import { setupBreakdown } from '@/domain/tuneB/setup';
import type { CaseState } from '@/domain/types/state';
import { FIXTURE_IDS, loadCase } from '../../helpers/portfolio';

/**
 * SPEC_BPMN § 19.11 F-B79 (phase B9e): the type of a programme activity (`ac:costProfile`) is read by the one monthly cost profile. Hand-computed on
 * golden (role rate 418 × 1.15, 220 working days, setup duration 12 months, horizon 36 months, tooling €35,000, hub setup €90,000 in month 1).
 */
const ROLE = 418 * 1.15, WD = 220, TOOLING = 35000;
const golden = (): CaseState => loadCase('golden');
const withValues = (s: CaseState, values: Record<string, string>): CaseState => ({ ...s, dom: { ...s.dom, values: { ...s.dom.values, ...values } } });
const typed = (line: string, p: string): CaseState => withValues(golden(), { [costProfileKey(line)]: p });
const line = (s: CaseState, id: string) => programmeLines(makeCtx(s)).find((l) => l.id === id)!;
const profile = (s: CaseState): number[] => engineNow(makeCtx(s)).K.setupProfile;

describe('defaults reproduce B9b: opening a case changes no figure', () => {
  it.each(FIXTURE_IDS)('%s: every line is Spread, laid by the B9b rule; an explicit Spread gives the same profile and headline', (id) => {
    const s = loadCase(id), c = makeCtx(s);
    for (const l of programmeLines(c)) {
      expect(activityType(c, PROGRAMME_ACTIVITIES.find((a) => lineOfKind(a.kind) === l.id)!.kind).profile).toBe('spread');
      expect(l.months).toEqual(spreadMonths(l.amount, l.duration!));
    }
    const all = Object.fromEntries(programmeLines(c).map((l) => [costProfileKey(l.id), 'spread'])), e = makeCtx(withValues(s, all));
    expect(engineProfile(e)).toEqual(engineProfile(c));
    expect(headlineOf(engineNow(e), e).npv).toBe(headlineOf(engineNow(c), c).npv);
  });
  it('an unknown stored value reads Spread', () => {
    expect(profile(typed('tooling', 'weekly'))).toEqual(profile(golden()));
  });
});

describe('each type, hand-computed (tooling: €35,000 over the 12-month setup)', () => {
  const base = profile(golden()), others = (t: number) => base[t]! - (t < 12 ? TOOLING / 12 : 0);
  it('One-off: the whole amount in its first month (product month 1); the total is unchanged', () => {
    const p = profile(typed('tooling', 'one-off'));
    expect(p[0]).toBeCloseTo(others(0) + TOOLING, 6);
    for (const t of [1, 5, 11, 12, 35]) expect(p[t]).toBeCloseTo(others(t), 6);
    expect(setupBreakdown(makeCtx(typed('tooling', 'one-off'))).total).toBeCloseTo(setupBreakdown(makeCtx(golden())).total, 6);
  });
  it('Recurring: a 12-month cycle at months 1, 13 and 25 of the 36-month horizon, €105,000 in all', () => {
    const s = typed('tooling', 'recurring'), p = profile(s);
    expect(line(s, 'tooling').amount).toBeCloseTo(3 * TOOLING, 6);
    for (const t of [0, 11, 12, 23, 24, 35]) expect(p[t]).toBeCloseTo(others(t) + TOOLING / 12, 6);
    expect(setupBreakdown(makeCtx(s)).total - setupBreakdown(makeCtx(golden())).total).toBeCloseTo(2 * TOOLING, 6);
  });
  it('Recurring on a 9-month training: cycles at 1, 13, 25; the labour days follow the cycles (0.5 FTE × 9 × 220 / 12 × 3)', () => {
    const s = withValues(typed('training', 'recurring'), { trainMonths: '9' }), l = line(s, 'training');
    expect(l.effortDays).toBeCloseTo(3 * 0.5 * 9 * (WD / 12), 6);
    expect(l.amount).toBeCloseTo(3 * 0.5 * 9 * (WD / 12) * ROLE, 6);
    expect(l.months.map((x) => (x > 0 ? 1 : 0)).join('')).toBe('111111111000111111111000111111111');
  });
  it('Spread on adoption curve: each month carries the S-curve\'s gain of that month, the total unchanged', () => {
    const s = typed('tooling', 'adoption'), c = makeCtx(golden()), curve = scurveView(c, 36).curve;
    const gains = Array.from({ length: 12 }, (_, k) => Math.max(0, curve(k + 1) - curve(k))), sum = gains.reduce((a, x) => a + x, 0);
    expect(sum).toBeGreaterThan(0);
    const m = line(s, 'tooling').months;
    gains.forEach((g, k) => expect(m[k]).toBeCloseTo((TOOLING * g) / sum, 6));
    expect(m.reduce((a, x) => a + x, 0)).toBeCloseTo(TOOLING, 6);
    expect(profile(s)[3]).toBeCloseTo(others(3) + (TOOLING * gains[3]!) / sum, 6);
  });
  it('the engagement stages share one line: its type is the type of the four stage activities', () => {
    const s = withValues(typed('stages', 'one-off'), { optStages: 'on' }), c = makeCtx(s);
    for (const k of ['stage-discover', 'stage-calibrate', 'stage-validate', 'stage-decide']) expect(activityType(c, k)).toEqual({ profile: 'one-off',
      line: 'stages', editable: true });
    expect(line(s, 'stages').months).toHaveLength(1);
  });
  it('the line types; the engine figures and milestones keep their owner\'s rule, read-only', () => {
    expect(LINE_PROFILES).toEqual(['one-off', 'spread', 'adoption', 'recurring']);
    const c = makeCtx(golden()), t = (k: string) => [activityType(c, k).profile, activityType(c, k).editable];
    expect([t('pilot'), t('build'), t('agentops'), t('hubRun'), t('ktPrep'), t('govGates')]).toEqual([['spread', false], ['adoption', false],
      ['recurring', false], ['recurring', false], ['spread', false], ['none', false]]);
    expect(activityType(makeCtx(typed('knowledge', 'one-off')), 'ktPrep').profile).toBe('one-off');   // the hub setup's type
  });
});
