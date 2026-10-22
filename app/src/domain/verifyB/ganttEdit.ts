/** @calc-zone delivery-views */
import type { Axis } from './ganttProgram';

/** How one Gantt program bar is driven: the case input behind it, its unit and its step sizes (normal / with Shift). */
export interface BarSpec { unit: string; step: number; big: number; min: number; max: number }

const WEEKS: BarSpec = { unit: 'weeks', step: 1, big: 4, min: 0, max: 520 };
/** The inputs that size the program bars. The bars themselves are derived, so the keyboard edits these inputs (the same fields as the forms). */
export const BAR_SPECS: Record<string, BarSpec> = {
  rmD1: WEEKS, rmD2: WEEKS, rmD3: WEEKS, rmD4: WEEKS,
  setupDuration: { unit: 'months', step: 1, big: 3, min: 1, max: 120 }, khSetupDays: { unit: 'days', step: 1, big: 7, min: 1, max: 3650 },
};

const DAY = 86400000;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "1 Sep 2026" (fixed month names: the output does not depend on the ICU locale data). */
const fmt = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const utc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

/** "1 Sep 2026 to 29 Sep 2026" for a span given in months from the roadmap start (month numbers when the start date is invalid). */
export function spanDates(ax: Axis, startM: number, durM: number): string {
  if (!ax.startOk) return `month ${startM.toFixed(1)} to month ${(startM + durM).toFixed(1)}`;
  const at = (m: number) => fmt(new Date(utc(ax.startDate).getTime() + Math.round(m * (365 / 12)) * DAY));
  return `${at(startM)} to ${at(startM + durM)}`;
}

export interface Nudge { id: string; value: string; text: string }
/** Resize: the new value of the input behind a bar after an arrow press (dir ±1), clamped; null when nothing changes or the bar is not editable. */
export function resizeBar(id: string, current: number, dir: 1 | -1, big: boolean): Nudge | null {
  const s = BAR_SPECS[id];
  if (!s) return null;
  const next = clamp(Math.round((current + dir * (big ? s.big : s.step)) * 100) / 100, s.min, s.max);
  return next === current ? null : { id, value: String(next), text: `${next} ${s.unit}` };
}
/** Move: shift the roadmap start date by one day (a week with Shift); null when the date is not a valid YYYY-MM-DD. */
export function moveStart(rmStart: string, dir: 1 | -1, big: boolean): Nudge | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rmStart);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]! + dir * (big ? 7 : 1)));
  return { id: 'rmStart', value: d.toISOString().slice(0, 10), text: `roadmap starts ${fmt(d)}` };
}
