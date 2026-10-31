import { describe, expect, it } from 'vitest';
import { makeCtx, type Ctx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { onboardingBand, roadmapStages } from '@/domain/frame/onboarding';
import { model } from '@/domain/model/overlay';
import { VARIABLES } from '@/domain/pdc/variables';
import { scheduledProducts } from '@/domain/portfolio';
import { ENGAGEMENT_STAGES, engineProfile, hubSetupTiming, pilotLine, pilotTiming, programmeCalendar, programmeLines, setupMonths, setupTiming,
  stageTimings, stageWeeks, TIMED_STAGES } from '@/domain/programme';
import { pilotSizing } from '@/domain/tune/program';
import { ganttView } from '@/domain/verifyB';
import { programRows } from '@/domain/verifyB/ganttProgram';
import { FIXTURE_IDS, identical, loadCase } from '../../helpers/portfolio';

/**
 * SPEC_BPMN § 19.4 F-B65 (phase B9b): ONE timing per programme activity (`domain/programme/timing.ts`), the conflicts T1–T4 collapsed to the
 * adopted decisions, read by the engine (through the cost profile), the Gantt, the engagement roadmap and runway, the Board, the pilot sizing,
 * the cost model and the waves. Each surface is compared with the rule written out here and with the owner, on the 107 fixtures.
 */
const W2M = 12 / 52;
const pos = (c: Ctx, id: string, def: number): number => { const n = c.inp.p(id); return !isNaN(n) && n > 0 ? n : def; };
/** T4 + D-B28: Discover, Calibrate, Validate = a positive input, else 4 weeks; Pilot & Prove = the pilot (prove weeks + 2 × break-in). */
const ruleWeeks = (c: Ctx) => [pos(c, 'rmD1', 4), pos(c, 'rmD2', 4), pos(c, 'rmD3', 4),
  (c.inp.p('pilotWeeks') || 12) + 2 * (c.inp.p('pilotBreakin') || 2)];

describe.each(FIXTURE_IDS)('programme timing owner: %s', (id) => {
  const c = makeCtx(loadCase(id));
  it('engagement stages: one reading (T4) read by the roadmap, the runway, the Board and the Gantt; Pilot & Prove lasts the pilot (D-B28)', () => {
    const w = ruleWeeks(c);
    expect(stageWeeks(c)).toEqual(w);
    expect(stageTimings(c).at(-1)!.weeks).toBe(pilotTiming(c).totalWeeks);
    expect(onboardingBand(c).totalWeeks).toBe(w[0]! + w[1]! + w[2]! + w[3]!);
    expect(roadmapStages(c, new Date('2027-01-01')).map((s) => s.name)).toEqual(ENGAGEMENT_STAGES.map((s) => s.name));
    expect(VARIABLES.find((v) => v.id === 'onboardWeeksTotal')!.get(c)).toBe(w.reduce((a, x) => a + x, 0));
  });
  it('the Gantt programme band is the owner\'s calendar: stages, build = the setup duration (D-B27), hub setup = its days', () => {
    const totalM = ganttView(c).axis.totalM, rows = programRows(c, totalM).rows, w = ruleWeeks(c);
    const stages = rows.filter((r) => TIMED_STAGES.some((s) => s.gantt === r.name));
    let t = 0;
    stages.forEach((r, i) => { expect([r.name, r.start, r.dur]).toEqual([TIMED_STAGES[i]!.gantt, t, w[i]! * W2M]); t += w[i]! * W2M; });
    const build = rows.find((r) => r.input === 'setupDuration')!;
    expect(build.dur).toBe(Math.max(0.5, pos(c, 'setupDuration', 12)));
    expect(build.dur).toBe(setupTiming(c).months);
    const hub = rows.find((r) => r.input === 'khSetupDays');
    if (hub) expect([hub.value, hub.dur]).toEqual([hubSetupTiming(c).days, Math.max(0.25, (Math.max(1, pos(c, 'khSetupDays', 30)) * 12) / 365)]);
    expect(programmeCalendar(c, totalM, { showStages: true, hub: true }).build.dur).toBe(setupMonths(c));
  });
  it('the engine spends the programme\'s cost profile (F-B68): its months add up to the setup total and to the lines', () => {
    const K = engineNow(c).K, p = engineProfile(c, K.horizonMonths), sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    expect(K.setupProfile).toEqual(p.setup);
    expect(sum(K.setupProfile)).toBeCloseTo(model(c).setupTotal, 4);
    expect(sum(K.setupProfile)).toBeCloseTo(sum(programmeLines(c).map((l) => l.amount)), 4);
    const m = engineNow(c).months();
    m.forEach((r, i) => expect(r.setupCost).toBeCloseTo(p.setup[i]!, 6));
  });
  it('the pilot is sized and priced by the programme\'s pilot activity, before the build (D-B28)', () => {
    const p = pilotSizing(c), t = pilotTiming(c), l = pilotLine(c);
    expect([p.weeks, p.breakIn, p.totalWeeks]).toEqual([c.inp.p('pilotWeeks') || 12, c.inp.p('pilotBreakin') || 2, t.totalWeeks]);
    expect(p.cost).toBe(l.cost);
    expect(l.from).toBe(1 - t.leadMonths);
    expect(l.months.length).toBe(t.leadMonths);
  });
});

describe('programme timing owner: the waves', () => {
  it('a setupEnd dependency and the capacity count the setup duration (D-B27: 12 months on golden)', () => {
    const pf = identical(loadCase('golden'), 3);
    const capped = { ...pf, maxConcurrentSetups: 1 }, s = scheduledProducts(capped);
    expect(setupMonths(makeCtx(loadCase('golden')))).toBe(12);
    expect(s.map((x) => x.month0)).toEqual([0, 12, 24]);
  });
});
