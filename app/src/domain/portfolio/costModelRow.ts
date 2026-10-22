import { sumOf } from './costModelAxis';
import type { CostFmt, CostFormula, CostRole, CostRow } from './costModelTypes';

/** The numbers of a row: t0 and one cell per month (null = empty). */
export interface Cells { t0: number | null; months: (number | null)[] }

/** Roles whose Total column is the sum of the months (flows, days); the others (rates, percentages, FTE, factors) have none. */
const SUMMED = new Set<CostRole>(['days', 'info', 'sub', 'adjust', 'teamcost', 'engine', 'diff', 'line', 'team', 'total']);

export function row(role: CostRole, keys: string[], unit: string, fmt: CostFmt, t0: number | null, months: (number | null)[], f?: CostFormula, bold = false): CostRow {
  return { role, keys, unit, fmt, t0, months, total: SUMMED.has(role) ? sumOf(months) : null, f, bold };
}

/** Month-by-month sum of rows; a month where every row is empty stays empty. */
export function addRows(rows: Cells[]): Cells {
  const n = rows[0]?.months.length ?? 0;
  return { t0: sumOf(rows.map((r) => r.t0)), months: Array.from({ length: n }, (_, i) => sumOf(rows.map((r) => r.months[i] ?? null))) };
}

/** Month-by-month a - b over the months where either is filled. */
export function subRows(a: Cells, b: Cells): Cells {
  const d = (x: number | null, y: number | null) => (x === null && y === null ? null : (x ?? 0) - (y ?? 0));
  return { t0: d(a.t0, b.t0), months: a.months.map((x, i) => d(x, b.months[i] ?? null)) };
}

/** Month-by-month sum of days x rate over paired rows (SUMPRODUCT); a month where no line has days stays empty. */
export function dotRows(days: Cells[], rates: Cells[]): Cells {
  const one = (pick: (c: Cells) => number | null): number | null => {
    const terms = days.map((d, i) => [pick(d), pick(rates[i] as Cells)] as const).filter(([d]) => d !== null);
    return terms.length ? terms.reduce((s, [d, r]) => s + (d as number) * (r ?? 0), 0) : null;
  };
  return { t0: one((c) => c.t0), months: (days[0]?.months ?? []).map((_, j) => one((c) => c.months[j] ?? null)) };
}
