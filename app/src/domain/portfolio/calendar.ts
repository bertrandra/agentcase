/** @calc-zone portfolio-consolidation */
import { addMonthsLocal, parseLocalDate } from '../verifyB/ganttLayout';
import type { Portfolio } from './types';

/** The portfolio's calendar: month 1 starts at `startDate`, else at the roadmap start of the common case (the Gantt's own default). */
export interface Calendar {
  /** ISO date of portfolio month 1 */
  start: string;
  /** "Sep 26"-style label of the date `m` months after the start (m = 0: month 1 begins; m = T: month T ends), or `M<m>` when the start is not a date */
  dateAt: (m: number) => string;
}

export function calendarOf(pf: Portfolio): Calendar {
  const start = pf.startDate || pf.common.dom?.values?.rmStart || '2026-09-01', d = parseLocalDate(start), ok = !isNaN(d.getTime()),
    labels = new Map<number, string>();
  const label = (m: number) => (ok ? addMonthsLocal(d, m).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : `M${m}`);
  return {
    start,
    dateAt: (m) => {
      const k = Math.round(m);
      let s = labels.get(k);
      if (s === undefined) { s = label(k); labels.set(k, s); }
      return s;
    },
  };
}
