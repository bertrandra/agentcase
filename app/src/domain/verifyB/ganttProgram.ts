import type { Ctx } from '../ctx';
import { engineNow } from '../canonical';
import { khEnabled } from '../knowledge';
import { addMonthsLocal, parseLocalDate } from './ganttLayout';

const W2M = 12 / 52;

/** A positive numeric input, else the default (legacy ganttNum). */
export function ganttNum(c: Ctx, id: string, def: number): number { const n = c.inp.p(id); return !isNaN(n) && n > 0 ? n : def; }

export interface Axis {
  horizon: number; totalM: number; startStr: string; startDate: Date; startOk: boolean;
  /** position (% of the axis) and width (min 0.4 %) of a span given in months */
  left: (m: number) => number; width: (m: number) => number; dateAt: (m: number) => string;
}
/** The calendar axis: horizon, roadmap start, month → % mapping and "Sep 26"-style tick labels. */
export function ganttAxis(c: Ctx): Axis {
  const horizon = parseInt(c.inp.v('horizon'), 10) || 3, totalM = Math.max(12, horizon * 12), startStr = c.inp.v('rmStart') || '2026-09-01';
  const startDate = parseLocalDate(startStr), startOk = !isNaN(startDate.getTime());
  return {
    horizon, totalM, startStr, startDate, startOk, left: (m) => (m / totalM) * 100, width: (m) => Math.max(0.4, (m / totalM) * 100),
    dateAt: (m) => (startOk ? addMonthsLocal(startDate, Math.round(m)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : `M${Math.round(m)}`),
  };
}

/** `input`/`value`: the case input that sizes the bar (keyboard-editable) and its current value in that input's unit. */
export interface ProgramRow { name: string; start: number; dur: number; color: string; meta: string; input?: string; value?: number }
/** Transformation program rows (months from the roadmap start) and where onboarding ends. */
export function programRows(c: Ctx, totalM: number): { rows: ProgramRow[]; onboardEnd: number; onboardWeeks: number } {
  const d = [1, 2, 3, 4].map((i) => Math.max(0, c.inp.p(`rmD${i}`) || 0)) as [number, number, number, number];
  const show = 'ganttShowOnboarding' in (c.s.dom?.checked ?? {}) ? c.inp.c('ganttShowOnboarding') : true;
  const rows: ProgramRow[] = []; let t = 0;
  if (show) {
    const steps: [string, string][] = [['🔍 Discover', '#0a6e9c'], ['🎯 Calibrate', '#0a6e9c'], ['✅ Validate', '#0a6e9c'], ['🚀 Pilot & Prove', '#b04600']];
    steps.forEach(([name, color], i) => { rows.push({ name, start: t, dur: d[i]! * W2M, color, meta: `${d[i]} wk`, input: `rmD${i + 1}`, value: d[i] }); t += d[i]! * W2M; });
  }
  const onboardEnd = t, build = Math.max(0.5, ganttNum(c, 'setupDuration', 12)), runStart = onboardEnd + build;
  rows.push({ name: '🧱 Agentic Build (ramp)', start: onboardEnd, dur: build, color: '#71609E', meta: `${build} mo ramp to steady state`, input: 'setupDuration', value: build });
  rows.push({ name: '⚙️ Agentic Run (steady state)', start: runStart, dur: Math.max(0, totalM - runStart), color: '#006e79', meta: 'ongoing delivery + support' });
  if (khEnabled(c)) {
    const days = Math.max(1, ganttNum(c, 'khSetupDays', 30)), setup = Math.max(0.25, (days * 12) / 365), runAt = onboardEnd + setup;
    rows.push({ name: '🧠 Knowledge Hub — Build / Setup', start: onboardEnd, dur: setup, color: '#006e79', meta: `${days} days: ingest, index, guardrails`, input: 'khSetupDays', value: days });
    rows.push({ name: '🧠 Knowledge Hub — Run', start: runAt, dur: Math.max(0, totalM - runAt), color: '#006e79', meta: 'ongoing curation + retrieval' });
  }
  return { rows, onboardEnd, onboardWeeks: Math.round(d[0] + d[1] + d[2] + d[3]) };
}

export interface Marker { label: string; month: number; family: string; date: string; title: string; left: number; lift: boolean }
/** Engine-derived milestones inside the horizon, placed on the calendar axis. */
export function milestoneMarkers(c: Ctx, ax: Axis): Marker[] {
  try {
    return engineNow(c).milestones().filter((x) => x.month >= 1 && x.month <= ax.totalM)
      .map((x, i) => ({ label: x.label, month: x.month, family: x.family, date: ax.dateAt(x.month), title: `${x.label} — ${ax.dateAt(x.month)} (month ${x.month})`, left: ax.left(x.month), lift: i % 2 === 0 }));
  } catch { return []; }
}
