/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { caseHorizonYears } from '../inputs';
import { engineNow } from '../canonical';
import { khEnabled } from '../knowledge';
import { addMonthsLocal, parseLocalDate } from './ganttLayout';
import type { ColourRole } from '../theme';
import { programmeCalendar } from '../programme/timing';
import { programmeActivityId } from '../programme/ids';

export { ganttNum } from '../programme/timing';

export interface Axis {
  horizon: number; totalM: number; startStr: string; startDate: Date; startOk: boolean;
  /** position (% of the axis) and width (min 0.4 %) of a span given in months */
  left: (m: number) => number; width: (m: number) => number; dateAt: (m: number) => string;
}
/** The calendar axis: horizon, roadmap start, month → % mapping and "Sep 26"-style tick labels. */
export function ganttAxis(c: Ctx): Axis {
  const horizon = caseHorizonYears(c.inp), totalM = Math.max(12, horizon * 12), startStr = c.inp.v('rmStart') || '2026-09-01';
  const startDate = parseLocalDate(startStr), startOk = !isNaN(startDate.getTime());
  return {
    horizon, totalM, startStr, startDate, startOk, left: (m) => (m / totalM) * 100, width: (m) => Math.max(0.4, (m / totalM) * 100),
    dateAt: (m) => (startOk ? addMonthsLocal(startDate, Math.round(m)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : `M${Math.round(m)}`),
  };
}

/** `input`/`value`: the case input that sizes the bar and its current value in that input's unit; `activity`: the programme activity it shows. */
export interface ProgramRow { name: string; start: number; dur: number; tone: ColourRole; meta: string; input?: string; value?: number; activity: string }
/**
 * Transformation program rows (months from the roadmap start) and where onboarding ends. The names come from the programme's stage list and
 * the placements from its timing owner (`programmeCalendar`, SPEC_BPMN § 19.4 F-B65): this band prints them, it times nothing itself.
 */
export function programRows(c: Ctx, totalM: number): { rows: ProgramRow[]; onboardEnd: number; onboardWeeks: number } {
  const showStages = 'ganttShowOnboarding' in (c.s.dom?.checked ?? {}) ? c.inp.c('ganttShowOnboarding') : true;
  const cal = programmeCalendar(c, totalM, { showStages, hub: khEnabled(c) }), rows: ProgramRow[] = [];
  for (const s of cal.stages) rows.push({ name: s.stage.gantt, start: s.start, dur: s.dur, tone: s.stage.tone, meta: `${s.weeks} wk`,
    input: s.stage.input ?? undefined, value: s.weeks, activity: programmeActivityId('stage', s.stage.id) });
  rows.push({ name: '🧱 Agentic Build (ramp)', ...cal.build, tone: 'chart-cat-4', meta: `${cal.build.dur} mo ramp to steady state`,
    input: 'setupDuration', value: cal.build.dur, activity: programmeActivityId('build') });
  rows.push({ name: '⚙️ Agentic Run (steady state)', ...cal.run, tone: 'chart-cat-2', meta: 'ongoing delivery + support',
    activity: programmeActivityId('run') });
  if (cal.hubSetup && cal.hubRun) {
    const { days, ...span } = cal.hubSetup;
    rows.push({ name: '🧠 Knowledge Hub — Build / Setup', ...span, tone: 'chart-cat-2', meta: `${days} days: ingest, index, guardrails`,
      input: 'khSetupDays', value: days, activity: programmeActivityId('hubSetup') });
    rows.push({ name: '🧠 Knowledge Hub — Run', ...cal.hubRun, tone: 'chart-cat-2', meta: 'ongoing curation + retrieval',
      activity: programmeActivityId('hubRun') });
  }
  return { rows, onboardEnd: cal.onboardEnd, onboardWeeks: cal.onboardWeeks };
}

export interface Marker { label: string; month: number; family: string; date: string; title: string; left: number; lift: boolean }
/** Engine-derived milestones inside the horizon, placed on the calendar axis. */
export function milestoneMarkers(c: Ctx, ax: Axis): Marker[] {
  try {
    return engineNow(c).milestones().filter((x) => x.month >= 1 && x.month <= ax.totalM)
      .map((x, i) => ({ label: x.label, month: x.month, family: x.family, date: ax.dateAt(x.month),
        title: `${x.label} — ${ax.dateAt(x.month)} (month ${x.month})`, left: ax.left(x.month), lift: i % 2 === 0 }));
  } catch { return []; }
}
