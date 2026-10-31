/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { caseHorizonYears } from '../inputs';
import { engineNow } from '../canonical';
import { khEnabled } from '../knowledge';
import { addMonthsLocal, parseLocalDate } from './ganttLayout';
import type { ColourRole } from '../theme';
import { programmeCalendar } from '../programme/timing';
import { ganttMonths, programmeGantt } from '../programme/gantt';

export { ganttNum } from '../programme/timing';

export interface Axis {
  horizon: number; totalM: number; startStr: string; startDate: Date; startOk: boolean;
  /** position (% of the axis) and width (min 0.4 %) of a span given in months */
  left: (m: number) => number; width: (m: number) => number; dateAt: (m: number) => string;
}
/** The calendar axis: horizon, roadmap start, month → % mapping and "Sep 26"-style tick labels. */
export function ganttAxis(c: Ctx): Axis {
  const horizon = caseHorizonYears(c.inp), totalM = ganttMonths(c), startStr = c.inp.v('rmStart') || '2026-09-01';
  const startDate = parseLocalDate(startStr), startOk = !isNaN(startDate.getTime());
  return {
    horizon, totalM, startStr, startDate, startOk, left: (m) => (m / totalM) * 100, width: (m) => Math.max(0.4, (m / totalM) * 100),
    dateAt: (m) => (startOk ? addMonthsLocal(startDate, Math.round(m)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : `M${Math.round(m)}`),
  };
}

/** `input`/`value`: the case input that sizes the bar and its current value in that input's unit; `activity`: the programme activity it shows. */
export interface ProgramRow { name: string; start: number; dur: number; tone: ColourRole; meta: string; input?: string; value?: number; activity: string }
/**
 * Transformation program rows (months from the roadmap start) and where onboarding ends: the band rows of the programme's ONE Gantt
 * (`programmeGantt`, SPEC_BPMN § 19.8 F-B73), which reads the timing owner (F-B65). This band prints them, it times nothing itself.
 */
export function programRows(c: Ctx, totalM: number): { rows: ProgramRow[]; onboardEnd: number; onboardWeeks: number } {
  const showStages = 'ganttShowOnboarding' in (c.s.dom?.checked ?? {}) ? c.inp.c('ganttShowOnboarding') : true, hub = khEnabled(c);
  const cal = programmeCalendar(c, totalM, { showStages, hub });
  const rows = programmeGantt(c, { totalM, showStages, hub }).filter((t) => t.band).sort((a, b) => a.band!.order - b.band!.order)
    .map((t): ProgramRow => ({ name: t.band!.label, start: t.start, dur: t.dur, tone: t.band!.tone, meta: t.band!.meta, input: t.band!.input,
      value: t.band!.value, activity: t.activity }));
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
