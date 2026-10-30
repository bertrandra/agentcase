import { describe, expect, it } from 'vitest';
import { makeCtx, type Ctx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { onboardingBand, roadmapStages } from '@/domain/frame/onboarding';
import { VARIABLES } from '@/domain/pdc/variables';
import { scheduledProducts } from '@/domain/portfolio';
import { ENGAGEMENT_STAGES, hubSetupTiming, pilotTiming, programmeCalendar, SETUP_PROFILE_MONTHS, setupTiming, stageTimings, stageWeeks,
  TIMED_STAGES } from '@/domain/programme';
import { pilotSizing } from '@/domain/tune/program';
import { ganttView } from '@/domain/verifyB';
import { programRows } from '@/domain/verifyB/ganttProgram';
import { FIXTURE_IDS, identical, loadCase } from '../../helpers/portfolio';

/**
 * SPEC_BPMN § 19.4 F-B65 (phase B9a): one timing owner per programme activity (`domain/programme/timing.ts`), read by the engine, the Gantt, the
 * engagement roadmap and runway, the Board, the pilot sizing, the cost model and the waves — WITHOUT moving a figure. Each surface's reading is
 * compared with the legacy formula it had before B9a (written out here) on the 107 fixtures, and with the owner.
 */
const W2M = 12 / 52;
const legacyGanttNum = (c: Ctx, id: string, def: number): number => { const n = c.inp.p(id); return !isNaN(n) && n > 0 ? n : def; };
/** Before B9a: the Gantt's own reading of the stages (verifyB/ganttProgram.ts), and the engagement's (frame/onboarding.ts). */
const legacyGanttWeeks = (c: Ctx) => [1, 2, 3, 4].map((i) => Math.max(0, c.inp.p(`rmD${i}`) || 0));
const legacyStageWeeks = (c: Ctx) => [4, 4, 4, 6].map((d, i) => c.inp.p('rmD' + (i + 1)) || d);

describe.each(FIXTURE_IDS)('programme timing owner: %s', (id) => {
  const c = makeCtx(loadCase(id));
  it('engagement stages: the roadmap, the runway, the Board and the Gantt read the one stage list and timing, with their pre-B9a values', () => {
    expect(stageWeeks(c)).toEqual(legacyStageWeeks(c));
    expect(stageTimings(c).map((s) => s.ganttWeeks)).toEqual(legacyGanttWeeks(c));
    const b = onboardingBand(c), w = legacyStageWeeks(c);
    expect(b.totalWeeks).toBe(w[0]! + w[1]! + w[2]! + w[3]!);
    expect(roadmapStages(c, new Date('2027-01-01')).map((s) => s.name)).toEqual(ENGAGEMENT_STAGES.map((s) => s.name));
    expect(VARIABLES.find((v) => v.id === 'onboardWeeksTotal')!.get(c)).toBe(w.reduce((a, x) => a + x, 0));
  });
  it('the Gantt programme band is the owner\'s calendar, equal to the legacy rows', () => {
    const totalM = ganttView(c).axis.totalM, rows = programRows(c, totalM).rows, d = legacyGanttWeeks(c), cal = programmeCalendar(c, totalM,
      { showStages: true, hub: true });
    const stages = rows.filter((r) => r.input?.startsWith('rmD'));
    let t = 0;
    stages.forEach((r, i) => { expect([r.name, r.start, r.dur]).toEqual([TIMED_STAGES[i]!.gantt, t, d[i]! * W2M]); t += d[i]! * W2M; });
    const build = rows.find((r) => r.input === 'setupDuration')!;
    expect(build.dur).toBe(Math.max(0.5, legacyGanttNum(c, 'setupDuration', 12)));
    expect(build.dur).toBe(setupTiming(c).buildMonths);
    expect(build.start).toBe(stages.length ? cal.onboardEnd : 0);
    const hub = rows.find((r) => r.input === 'khSetupDays');
    if (hub) expect([hub.value, hub.dur]).toEqual([hubSetupTiming(c).days, Math.max(0.25, (Math.max(1, legacyGanttNum(c, 'khSetupDays', 30)) * 12) / 365)]);
  });
  it('the engine spreads the setup over the owner\'s months (6, unchanged), and the pilot is sized from the owner\'s weeks', () => {
    expect(engineNow(c).K.setupProfileMonths).toBe(SETUP_PROFILE_MONTHS);
    expect(engineNow(c).K.setupProfileMonths).toBe(setupTiming(c).engineMonths);
    const p = pilotSizing(c), t = pilotTiming(c), legacyWeeks = c.inp.p('pilotWeeks') || 12, legacyBreak = c.inp.p('pilotBreakin') || 2;
    expect([p.weeks, p.breakIn, p.totalWeeks]).toEqual([legacyWeeks, legacyBreak, legacyWeeks + legacyBreak * 2]);
    expect([t.weeks, t.breakIn, t.totalWeeks, t.costFromProductMonth]).toEqual([p.weeks, p.breakIn, p.totalWeeks, 1]);
  });
});

describe('programme timing owner: the waves', () => {
  it('a setupEnd dependency and the capacity count the owner\'s setup months', () => {
    const pf = identical(loadCase('golden'), 3);
    const capped = { ...pf, maxConcurrentSetups: 1 }, s = scheduledProducts(capped);
    expect(s.map((x) => x.month0)).toEqual([0, SETUP_PROFILE_MONTHS, 2 * SETUP_PROFILE_MONTHS]);
  });
});
