/** @calc-zone run-setup-taxes */
import type { Ctx } from '../ctx';
import { ktLead } from '../portfolio/subset';
import type { KnowledgeSubset } from '../portfolio/types';
import { TIMED_STAGES, type EngagementStage } from './stages';

/**
 * The ONE timing owner of the transformation programme's activities (docs/SPEC_BPMN.md § 19.4 F-B65). Every surface that places or sizes a
 * programme activity in time reads it: the programme cost profile (`profile.ts`, which the Time Engine and the cost model read), the Gantt
 * programme band, the engagement roadmap and runway, the Board variables, the pilot sizing, the waves and the knowledge-transfer preparation.
 * Phase B9b collapsed the readings B9a kept per surface to the adopted decisions (§ 19.6): D-B27 a setup line lasts its activity's duration
 * (the setup duration `setupDuration` unless the activity has its own), D-B28 the pilot is the Pilot & Prove stage before the build, D-B29 the hub
 * setup lasts its days and is placed `ktLeadMonths` before the product's month 0, T4 one stage default. Pure, light (no model run).
 */
export const WEEKS_PER_MONTH = 52 / 12;
const W2M = 12 / 52;
/** A positive numeric input, else the default (legacy ganttNum). */
export function ganttNum(c: Ctx, id: string, def: number): number { const n = c.inp.p(id); return !isNaN(n) && n > 0 ? n : def; }
/** A field left at 0 or blank falls back to its default (legacy `P(id) || default`). */
const orDefault = (c: Ctx, id: string, def: number): number => c.inp.p(id) || def;

/**
 * An amount spent evenly over `months` (fractional allowed) from the first month: entry k = amount × min(1, months − k) / months, the last month
 * pro rata; the entries add up to the amount. Empty without a duration or an amount. The one spreading rule of the programme (pilot, setup lines,
 * hub setup, opt-in activities).
 */
export function spreadMonths(amount: number, months: number): number[] {
  if (!(months > 0) || !(amount !== 0) || !isFinite(amount)) return [];
  return Array.from({ length: Math.ceil(months - 1e-9) }, (_, k) => (amount * Math.min(1, months - k)) / months);
}

export interface StageTiming {
  stage: EngagementStage;
  /** weeks, the one reading of every surface (T4): a positive input, else the stage default; Pilot & Prove lasts the pilot (D-B28) */
  weeks: number;
}
/** The four timed engagement stages (Discover, Calibrate, Validate, Pilot & Prove) with their durations. */
export const stageTimings = (c: Ctx): StageTiming[] => TIMED_STAGES.map((s) => ({
  stage: s, weeks: s.id === 'pilotProve' ? pilotTiming(c).totalWeeks : ganttNum(c, s.input as string, s.defaultWeeks),
}));
/** The stage durations in weeks (legacy `stageWeeks`). */
export const stageWeeks = (c: Ctx): number[] => stageTimings(c).map((s) => s.weeks);

/** The setup duration in months (`setupDuration`, default 12, at least 0.5): the Gantt build, the waves' setup, the default of every setup line. */
export const setupMonths = (c: Ctx): number => Math.max(0.5, ganttNum(c, 'setupDuration', 12));
/** A setup activity's own duration in months (`key`), else the setup duration (D-B27 (c), which reduces to (b) when the lines share one). */
export const lineMonths = (c: Ctx, key: string | null): number => (key ? ganttNum(c, key, setupMonths(c)) : setupMonths(c));
export interface SetupTiming {
  /** months of the setup (the Gantt build bar, the waves' capacity and `setupEnd` dependencies, the default spread of a setup line) */
  months: number;
}
export const setupTiming = (c: Ctx): SetupTiming => ({ months: setupMonths(c) });

export interface PilotTiming {
  /** prove weeks, break-in sprints, and the pilot's length (prove weeks + 2 weeks per break-in sprint) */
  weeks: number; breakIn: number; totalWeeks: number; months: number;
  /** whole months the pilot occupies before the build (product month 1): it ends when the build starts (D-B28) */
  leadMonths: number;
}
export function pilotTiming(c: Ctx): PilotTiming {
  const breakIn = orDefault(c, 'pilotBreakin', 2), weeks = orDefault(c, 'pilotWeeks', 12), totalWeeks = weeks + breakIn * 2, months = (totalWeeks * 12) / 52;
  return { weeks, breakIn, totalWeeks, months, leadMonths: months > 0 ? Math.ceil(months - 1e-9) : 0 };
}

export interface HubSetupTiming {
  /** days of the hub setup (`khSetupDays`, default 30, at least 1) and its months (at least a week): the Gantt bar and the spend */
  days: number; months: number;
}
export function hubSetupTiming(c: Ctx): HubSetupTiming {
  const days = Math.max(1, ganttNum(c, 'khSetupDays', 30));
  return { days, months: Math.max(0.25, (days * 12) / 365) };
}
/** Months the knowledge transfer (and the product's hub setup) is prepared before its month 0 (`ktLeadMonths`; the consolidation caps it). */
export const ktPrepMonths = (k: KnowledgeSubset): number => ktLead(k);

/** A bar of the programme calendar: months from the roadmap start. */
export interface Span { start: number; dur: number }
export interface ProgrammeCalendar {
  stages: (Span & StageTiming)[];
  /** end of the onboarding stages (0 when they are hidden) and their total in weeks */
  onboardEnd: number; onboardWeeks: number;
  build: Span; run: Span;
  hubSetup: (Span & { days: number }) | null; hubRun: Span | null;
}
/**
 * The programme band of the Gantt: stages back to back from the roadmap start (Pilot & Prove = the pilot), then the build (product month 1)
 * and the run; with the hub, its setup ends at the build start (a single case has no knowledge-transfer lead, so it starts there) and its run follows.
 */
export function programmeCalendar(c: Ctx, totalM: number, o: { showStages: boolean; hub: boolean }): ProgrammeCalendar {
  const all = stageTimings(c), stages: ProgrammeCalendar['stages'] = [];
  let t = 0;
  if (o.showStages) for (const s of all) { stages.push({ ...s, start: t, dur: s.weeks * W2M }); t += s.weeks * W2M; }
  const onboardEnd = t, build = setupMonths(c), runStart = onboardEnd + build, h = hubSetupTiming(c), hubAt = onboardEnd + h.months;
  return {
    stages, onboardEnd, onboardWeeks: Math.round(all.reduce((s, x) => s + x.weeks, 0)), build: { start: onboardEnd, dur: build },
    run: { start: runStart, dur: Math.max(0, totalM - runStart) },
    hubSetup: o.hub ? { start: onboardEnd, dur: h.months, days: h.days } : null, hubRun: o.hub ? { start: hubAt, dur: Math.max(0, totalM - hubAt) } : null,
  };
}
