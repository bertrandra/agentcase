/** @calc-zone run-setup-taxes */
import type { Ctx } from '../ctx';
import { ktLead } from '../portfolio/subset';
import type { KnowledgeSubset } from '../portfolio/types';
import { TIMED_STAGES, type EngagementStage } from './stages';

/**
 * The ONE timing owner of the transformation programme's activities (docs/SPEC_BPMN.md § 19.4 F-B65; phase B9a). Every surface that places or
 * sizes a programme activity in time reads it: the Time Engine's setup profile, the Gantt programme band, the engagement roadmap and runway, the
 * Board variables, the pilot sizing and the cost model's pilot months, the waves (through the engine's setup profile) and the knowledge-transfer
 * preparation. Phase B9a is figure-neutral: where two surfaces disagreed (conflicts T1–T5 of § 19.1), the owner gives each surface its current
 * reading, named after it (`engineMonths` / `buildMonths`, `weeks` / `ganttWeeks`…); phase B9b collapses each pair to the adopted decision.
 * Pure, light (no model run), so the engine kernel can read it.
 */
export const WEEKS_PER_MONTH = 52 / 12;
const W2M = 12 / 52;
/** A positive numeric input, else the default (legacy ganttNum). */
export function ganttNum(c: Ctx, id: string, def: number): number { const n = c.inp.p(id); return !isNaN(n) && n > 0 ? n : def; }
/** A field left at 0 or blank falls back to its default (legacy `P(id) || default`). */
const orDefault = (c: Ctx, id: string, def: number): number => c.inp.p(id) || def;

export interface StageTiming {
  stage: EngagementStage;
  /** weeks as the engagement roadmap, the runway band and the Board read them: blank or 0 → the stage default */
  weeks: number;
  /** weeks as the Gantt programme band reads them: blank → 0, never negative (T4: B9b aligns the two readings) */
  ganttWeeks: number;
}
/** The four timed engagement stages (Discover, Calibrate, Validate, Pilot & Prove) with their durations. */
export const stageTimings = (c: Ctx): StageTiming[] => TIMED_STAGES.map((s) => {
  const raw = c.inp.p(s.input as string);
  return { stage: s, weeks: raw || s.defaultWeeks, ganttWeeks: Math.max(0, raw || 0) };
});
/** The stage durations in weeks, engagement reading (legacy `stageWeeks`). */
export const stageWeeks = (c: Ctx): number[] => stageTimings(c).map((s) => s.weeks);

/** The months over which the engine spreads the setup (T1: fixed; the Gantt build reads `setupDuration`; D-B27 unifies them in B9b). */
export const SETUP_PROFILE_MONTHS = 6;
export interface SetupTiming {
  /** months of the engine's setup profile: the setup lines, the change cost and the hub setup are spent evenly over them; also the setup length
   * the wave capacity and `setupEnd` dependencies count */
  engineMonths: number;
  /** months of the Gantt "Agentic Build (ramp)" bar (`setupDuration`, default 12, at least 0.5) */
  buildMonths: number;
}
export const setupTiming = (c: Ctx): SetupTiming => ({ engineMonths: SETUP_PROFILE_MONTHS, buildMonths: Math.max(0.5, ganttNum(c, 'setupDuration', 12)) });

export interface PilotTiming {
  /** prove weeks, break-in sprints, and the pilot's length (prove weeks + 2 weeks per break-in sprint) */
  weeks: number; breakIn: number; totalWeeks: number; months: number;
  /** where the cost model spends it (T2): from the product's month 1, evenly; the Gantt shows the "Pilot & Prove" stage instead */
  costFromProductMonth: number;
}
export function pilotTiming(c: Ctx): PilotTiming {
  const breakIn = orDefault(c, 'pilotBreakin', 2), weeks = orDefault(c, 'pilotWeeks', 12), totalWeeks = weeks + breakIn * 2;
  return { weeks, breakIn, totalWeeks, months: (totalWeeks * 12) / 52, costFromProductMonth: 1 };
}

export interface HubSetupTiming {
  /** days of the Gantt "Knowledge Hub — Build / Setup" bar (`khSetupDays`, default 30, at least 1) and its months (at least a week) */
  days: number; ganttMonths: number;
  /** the engine spends the hub setup inside its setup profile (T3) */
  engineMonths: number;
}
export function hubSetupTiming(c: Ctx): HubSetupTiming {
  const days = Math.max(1, ganttNum(c, 'khSetupDays', 30));
  return { days, ganttMonths: Math.max(0.25, (days * 12) / 365), engineMonths: SETUP_PROFILE_MONTHS };
}
/** Months the knowledge transfer of a product is prepared before its month 0 (`ktLeadMonths`; the consolidation caps it at month 0). */
export const ktPrepMonths = (k: KnowledgeSubset): number => ktLead(k);

/** A bar of the programme calendar: months from the roadmap start. */
export interface Span { start: number; dur: number }
export interface ProgrammeCalendar {
  stages: (Span & StageTiming)[];
  /** end of the onboarding stages (0 when they are hidden) and their total in weeks (Gantt reading) */
  onboardEnd: number; onboardWeeks: number;
  build: Span; run: Span;
  hubSetup: (Span & { days: number }) | null; hubRun: Span | null;
}
/** The programme band of the Gantt: stages back to back from the roadmap start, then the build ramp, the run and (hub on) the hub setup and run. */
export function programmeCalendar(c: Ctx, totalM: number, o: { showStages: boolean; hub: boolean }): ProgrammeCalendar {
  const all = stageTimings(c), stages: ProgrammeCalendar['stages'] = [];
  let t = 0;
  if (o.showStages) for (const s of all) { stages.push({ ...s, start: t, dur: s.ganttWeeks * W2M }); t += s.ganttWeeks * W2M; }
  const onboardEnd = t, build = setupTiming(c).buildMonths, runStart = onboardEnd + build, h = hubSetupTiming(c), hubAt = onboardEnd + h.ganttMonths;
  return {
    stages, onboardEnd, onboardWeeks: Math.round(all.reduce((s, x) => s + x.ganttWeeks, 0)), build: { start: onboardEnd, dur: build },
    run: { start: runStart, dur: Math.max(0, totalM - runStart) },
    hubSetup: o.hub ? { start: onboardEnd, dur: h.ganttMonths, days: h.days } : null, hubRun: o.hub ? { start: hubAt, dur: Math.max(0, totalM - hubAt) } : null,
  };
}
