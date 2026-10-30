/** @calc-zone process-model */
/**
 * ISO 8601 durations and repeating intervals of BPMN timers (spec F-B45; phase B5b), read as days: `P2W` = 14, `PT36H` = 1.5, `R/P2W` = a
 * repetition every 14 days, `R4/2026-01-05T09:00:00Z/P1M` = four repetitions every 30 days. Calendar units use fixed lengths (a month is 30 days,
 * a year 365) because the model reasons in averages, not dates. Anything else is not a duration (undefined), never an error.
 */
const UNIT_DAYS: Record<string, number> = { Y: 365, M: 30, W: 7, D: 1 };
const TIME_DAYS: Record<string, number> = { H: 1 / 24, M: 1 / 1440, S: 1 / 86400 };

/** The length in days of an ISO 8601 duration (`P1Y2M3W4DT5H6M7S`, decimal fractions allowed), or undefined. */
export function durationDays(iso: string | undefined): number | undefined {
  const s = (iso ?? '').trim();
  if (!s.startsWith('P') || s.length < 3 || s.length > 64) return undefined;
  let days = 0, inTime = false, num = '', any = false;
  for (const c of s.slice(1)) {
    if (c === 'T') { if (inTime || num) return undefined; inTime = true; continue; }
    if ((c >= '0' && c <= '9') || c === '.' || c === ',') { num += c === ',' ? '.' : c; continue; }
    const per = (inTime ? TIME_DAYS : UNIT_DAYS)[c];
    if (per === undefined || !num || !Number.isFinite(Number(num))) return undefined;
    days += Number(num) * per;
    num = '';
    any = true;
  }
  return any && !num ? days : undefined;
}

export interface Cycle { days: number; repeat?: number }
/** A repeating interval (`R[n]/duration`, `R[n]/start/duration`, `R[n]/duration/end`), or a bare duration, as days between repetitions. */
export function cycleOf(iso: string | undefined): Cycle | undefined {
  const s = (iso ?? '').trim();
  if (!s.startsWith('R')) { const d = durationDays(s); return d === undefined ? undefined : { days: d }; }
  const parts = s.split('/'), head = (parts[0] as string).slice(1);
  if (parts.length < 2 || parts.length > 3 || (head && !/^\d+$/.test(head))) return undefined;
  const d = durationDays(parts.find((p, i) => i > 0 && p.startsWith('P')));
  if (d === undefined) return undefined;
  return head ? { days: d, repeat: Number(head) } : { days: d };
}
