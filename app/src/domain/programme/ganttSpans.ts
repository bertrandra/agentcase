/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { hriEnabled } from '../engagement';
import type { ProgrammeActivityDef } from './catalogue';
import { optInOfKind, optInOn, optInPlan } from './optIn';
import { DURATION_KEY } from './placement';
import { coachingPlan, horizonMonthsOf, programmeRates } from './profile';
import { hubSetupTiming, lineMonths, setupMonths, type ProgrammeCalendar } from './timing';

/**
 * Where a programme activity sits on the case calendar (months from the roadmap start), as the timing owner places it (`timing.ts`, F-B65;
 * docs/SPEC_BPMN.md § 19.8 F-B73, phase B9d): the bar the Gantt, the WBS dictionary, the histogram and the MS Project export read. Product
 * month 1 starts when the onboarding stages end (`onboardEnd`). Nothing is timed here: each case reads its owner (the stage list, the setup
 * duration or the line's own, the coaching plan, the hub setup days, the opt-in plan). Null: the activity has no bar (its module or its
 * switch is off, a single case has no knowledge-transfer lead, the stages are hidden).
 */
export interface Bar { start: number; dur: number; milestone: boolean }
export interface SpanOpts {
  /** the Knowledge Hub is on (its setup, transfer preparation and run have bars) */
  hub: boolean;
  /** months the product's hub setup and knowledge transfer are prepared before its month 0 (a portfolio product; 0 for a single case) */
  lead: number;
}
const bar = (start: number, dur: number, milestone = false): Bar => ({ start, dur: Math.max(0, dur), milestone });

function optInBar(c: Ctx, d: ProgrammeActivityDef, O: number): Bar | null {
  const o = optInOfKind(d.kind);
  if (!o || o.kinds.length > 1 || !optInOn(c, o)) return null;
  const p = optInPlan(c, o.id, horizonMonthsOf(c), programmeRates(c).wd);
  return bar(O + p.from - 1, p.months);
}

function setupBar(c: Ctx, d: ProgrammeActivityDef, O: number): Bar | null {
  if (d.kind === 'setupCoaching') {
    const p = coachingPlan(c);
    return p.months > 0 ? bar(O, Math.min(p.months, horizonMonthsOf(c))) : null;
  }
  return bar(O, d.kind === 'change' ? setupMonths(c) : lineMonths(c, DURATION_KEY[d.kind] ?? null));
}

/** The bar of one activity of the catalogue. */
export function activityBar(c: Ctx, d: ProgrammeActivityDef, cal: ProgrammeCalendar, o: SpanOpts): Bar | null {
  const O = cal.onboardEnd;
  if ((d.module === 'khEnabled' && !o.hub) || (d.module === 'hriEnabled' && !hriEnabled(c))) return null;
  switch (d.timing) {
    case 'stage': {
      const s = cal.stages.find((x) => `stage-${x.stage.id}` === d.kind);
      return s ? bar(s.start, s.dur) : null;
    }
    case 'gate': return cal.stages.length ? bar(O, 0, true) : null;
    case 'pilot': {
      const s = cal.stages.find((x) => x.stage.id === 'pilotProve');
      return s ? bar(s.start, s.dur) : null;
    }
    case 'setup': return setupBar(c, d, O);
    case 'hubSetup': return bar(o.lead > 0 ? O - o.lead : O, hubSetupTiming(c).months);
    case 'ktPrep': return o.lead > 0 ? bar(O - o.lead, o.lead) : null;
    case 'build': return bar(cal.build.start, cal.build.dur);
    case 'run': return bar(cal.run.start, cal.run.dur);
    case 'hubRun': return cal.hubRun && bar(cal.hubRun.start, cal.hubRun.dur);
    case 'optIn': return optInBar(c, d, O);
    default: return null;
  }
}
