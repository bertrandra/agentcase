/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import type { CurvePoint } from '../types/state';
import { levelLabelFor } from '../maturityBounds';
import { maturityBounds } from './automation';
import { curveOf, ensurePts, type CurveFn } from './scurve';

export interface MaturityLevel { lvl: string; from: number; range: string; month: number | null; when: string }
export interface ScurveView {
  N: number; family: string; pts: CurvePoint[]; curve: CurveFn; levels: MaturityLevel[]; endYear: number; endAdoption: number; endMaturity: string;
  /** the adoption bands drawn behind the curve ([from, to, level], from the case's editable bounds) and the gridlines at every bound and 100 % */
  bands: [number, number, string][]; grid: number[];
  /** "L1 0–25%, L2 25–55%, …" (the explanation text) */
  levelsText: string;
}

const parseLocalDate = (s: string): Date => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? new Date(+(m[1] as string), +(m[2] as string) - 1, +(m[3] as string)) : new Date(s); };
function addMonthsLocal(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  r.setDate(Math.min(d.getDate(), new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
  return r;
}

/** Average month length (days) of the "now" marker. */
export const MONTH_DAYS = 30.44;
/** Programme month (1 = the start month, fractional) at the date `now` (epoch ms, passed by the UI), 0 when the start date is not a date. */
export function programMonthAt(start: string, now: number): number {
  const st = new Date(start);
  return isNaN(st.getTime()) ? 0 : (now - st.getTime()) / (MONTH_DAYS * 86400000) + 1;
}

/** Month label of the legend: calendar month from the start date ("Sep 26"), or "month 12" without one (legacy dateAt). */
export function monthLabel(start: string, month: number): string {
  if (!start) return `month ${month}`;
  const d = parseLocalDate(start);
  if (isNaN(d.getTime())) return `month ${month}`;
  return addMonthsLocal(d, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

/** What the adoption-curve editor shows: the points valid for the horizon, the curve through them, and where it crosses each maturity threshold. */
export function scurveView(c: Ctx, horizonMonths: number): ScurveView {
  const N = Math.max(1, horizonMonths), sc = c.s.scurve;
  const pts = ensurePts(sc?.pts, N, [1, 2, 3].map((i) => c.inp.p(`y${i}Ramp`))), family = sc?.family ?? 'spline', curve = curveOf(family, pts);
  const bounds = maturityBounds(c), start = c.inp.v('rmStart');
  const cross = (th: number): number | null => { if (th <= 0) return 1; for (let t = 1; t <= N; t++) if (curve(t) >= th) return t; return null; };
  const levels = bounds.map((from, i) => {
    const month = cross(from);
    return { lvl: `L${i + 1}`, from, range: `${Math.round(from)}–${Math.round(i + 1 < bounds.length ? (bounds[i + 1] as number) : 100)}%`, month, when: month == null ? 'beyond horizon' : `${monthLabel(start, month)} · month ${month}` };
  });
  const endAdoption = Math.round(curve(N));
  const bands = levels.map((l, i): [number, number, string] => [l.from, i + 1 < bounds.length ? (bounds[i + 1] as number) : 100, l.lvl]);
  return { N, family, pts, curve, levels, endYear: Math.max(1, Math.round(N / 12)), endAdoption, endMaturity: levelLabelFor(endAdoption, bounds), bands,
    grid: [...bounds, 100], levelsText: levels.map((l) => `${l.lvl} ${l.range}`).join(', ') };
}
