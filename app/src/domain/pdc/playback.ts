/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { engineNow } from '../canonical';
import { monthlySeries } from '../economics/monthlySeries';
import { model } from '../model/overlay';
import { anchorClamp, daGet } from '../verifyB/anchors';
import { perfRel } from '../verifyB/perf';

export const MP_COST_SP_ASIS = 650, MP_COST_SP_TARGET = 185;

/** Month-by-month series (index 0 = AS-IS) read from the live Time Engine (legacy getMonthlySeries()). */
export interface PlaybackSeries {
  humanFte: number[]; agentVfte: number[]; teamCost: number[]; tokenCost: number[]; totalCost: number[]; netMonth: number[]; cumulative: number[];
  velocity: number[]; costPerSp: number[]; ramp: number[]; horizon: number; months: number;
}

export function playbackSeries(c: Ctx): PlaybackSeries {
  const m = model(c), months = m.horizon * 12, eng = engineNow(c), ms = monthlySeries(eng), v = daGet(c.s, 'velocitySp');
  const out: PlaybackSeries = { humanFte: [m.base.etp], agentVfte: [0], teamCost: [m.baselineRun / 12], tokenCost: [0], totalCost: [m.baselineRun / 12],
    netMonth: [0], cumulative: [0], velocity: [v.asis], costPerSp: [MP_COST_SP_ASIS], ramp: [0], horizon: m.horizon, months };
  for (let mo = 1; mo <= months; mo++) {
    const er = eng.monthAt(mo), r = er.adoptionRampPct, rel = perfRel(c, r), row = ms[mo - 1];
    out.humanFte.push(er.humanFte); out.agentVfte.push(er.agentVfte);
    out.teamCost.push(row ? row.teamCost : 0); out.tokenCost.push(row ? row.tokenCost : 0); out.totalCost.push(row ? row.total : 0);
    out.netMonth.push(row ? row.sav - row.setupSpend : 0); out.cumulative.push(row ? row.cum : 0);
    out.velocity.push(anchorClamp(v.asis, v.target, rel)); out.costPerSp.push(anchorClamp(MP_COST_SP_ASIS, MP_COST_SP_TARGET, rel)); out.ramp.push(r);
  }
  return out;
}

export type MetricKey = 'fte' | 'cost' | 'savings' | 'velocity' | 'costsp';
export const MP_ORDER: MetricKey[] = ['fte', 'cost', 'savings', 'velocity', 'costsp'];
export const MP_META: Record<MetricKey, { title: string; yLabel: string; checkbox: string }> = {
  fte: { title: 'Human FTE / agent vFTE', yLabel: 'FTE', checkbox: 'Human FTE / agent vFTE' },
  cost: { title: 'Monthly run cost', yLabel: '€ / month', checkbox: 'Monthly run cost' },
  savings: { title: 'Cumulative savings', yLabel: '€ cumulative', checkbox: 'Cumulative savings' },
  velocity: { title: 'Velocity', yLabel: 'SP / sprint', checkbox: 'Velocity' },
  costsp: { title: 'Cost / point', yLabel: '€ / point', checkbox: 'Cost / point' },
};

/** The curve(s) a metric plots. */
export function metricSeries(s: PlaybackSeries, k: MetricKey): number[][] {
  return k === 'fte' ? [s.humanFte, s.agentVfte] : k === 'cost' ? [s.totalCost] : k === 'savings' ? [s.cumulative] : k === 'velocity' ? [s.velocity] : [s.costPerSp];
}

/** Axis range with an 8 % margin (legacy mpRange). */
export function mpRange(vals: number[]): { min: number; max: number } {
  let lo = Infinity, hi = -Infinity;
  for (const v of vals) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  let span = hi - lo; if (span <= 0) span = Math.max(1, Math.abs(hi) || 1);
  return { min: Math.floor(lo - 0.08 * span), max: Math.ceil(hi + 0.08 * span) };
}

export const mpYearLabel = (mo: number): string => (mo === 0 ? 'AS-IS' : `Y${Math.ceil(mo / 12)}`);
export const mpReadout = (mo: number): string => `Month ${mo} · ${mpYearLabel(mo)}`;

/** Next playback position: advance one month, then the next metric, then loop or stop at the end. */
export function mpAdvance(p: { month: number; seq: number }, months: number, count: number, loop: boolean): { month: number; seq: number; stop: boolean } {
  const month = p.month + 1;
  if (month <= months) return { month, seq: p.seq, stop: false };
  if (p.seq < count - 1) return { month: 0, seq: p.seq + 1, stop: false };
  return loop ? { month: 0, seq: 0, stop: false } : { month: months, seq: p.seq, stop: true };
}
