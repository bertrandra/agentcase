/** @calc-zone exports */
import { planDate } from './plan';

/**
 * Working time for the MS Project XML export (`mspdi.ts`; docs/SPEC_BPMN.md § 19.8 F-B77, phase B9d): the standard calendar (Monday to
 * Friday, 08:00–12:00 and 13:00–17:00, 8 hours a day). A bar starts on its first working day at 08:00 and finishes on its last working day at
 * 17:00; its duration is its working days, so MS Project, ProjectLibre or Primavera find the same dates when they schedule it again.
 */
const DAY = 86400000;
const weekend = (d: Date): boolean => d.getUTCDay() === 0 || d.getUTCDay() === 6;
const ymd = (d: Date): string => d.toISOString().slice(0, 10);
const nextWorking = (d: Date): Date => { let x = d; while (weekend(x)) x = new Date(x.getTime() + DAY); return x; };

export interface WorkSpan { start: string; finish: string; days: number }
/** A bar of the plan (months from the roadmap start) on the standard calendar. A milestone starts and finishes at 08:00 of its day. */
export function workSpan(startDate: string, start: number, dur: number, milestone: boolean): WorkSpan {
  const s = nextWorking(planDate(startDate, start));
  if (milestone || dur <= 0) return { start: `${ymd(s)}T08:00:00`, finish: `${ymd(s)}T08:00:00`, days: 0 };
  const e = planDate(startDate, start + dur);
  let days = 0, last = s;
  for (let x = s; x < e || days === 0; x = new Date(x.getTime() + DAY)) if (!weekend(x)) { days++; last = x; }
  return { start: `${ymd(s)}T08:00:00`, finish: `${ymd(last)}T17:00:00`, days };
}
/** An MSPDI duration: whole hours and minutes, `PT<h>H<m>M0S`. */
export const duration = (hours: number): string => { const m = Math.round(hours * 60); return `PT${Math.floor(m / 60)}H${m % 60}M0S`; };
/** A lag of `months` in tenths of a minute (MSPDI `LinkLag`), counted in working days (21.67 a month at 8 hours). */
export const linkLag = (months: number): number => Math.round(months * (260 / 12) * 8 * 60 * 10);

/** The standard calendar (UID 1). */
export function standardCalendar(): string {
  const day = (t: number, working: boolean): string => `<WeekDay><DayType>${t}</DayType><DayWorking>${working ? 1 : 0}</DayWorking>${working
    ? '<WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime>'
      + '<ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes>' : ''}</WeekDay>`;
  return `<Calendars><Calendar><UID>1</UID><Name>Standard</Name><IsBaseCalendar>1</IsBaseCalendar><WeekDays>${
    [1, 2, 3, 4, 5, 6, 7].map((t) => day(t, t !== 1 && t !== 7)).join('')}</WeekDays></Calendar></Calendars>`;
}
