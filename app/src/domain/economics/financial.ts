import type { YearRow } from '../time/years';
import type { EconomicsView } from './view';

/** Per-year columns of the Financial section (one entry per year of the horizon). */
export interface YearSeries {
  team: number[]; token: number[]; infra: number[]; agentRun: number[]; run: number[]; savings: number[]; humanFte: number[]; agentVfte: number[];
}

export const yearSeries = (ys: YearRow[]): YearSeries => ({
  team: ys.map((y) => y.teamCost), token: ys.map((y) => y.tokenCost), infra: ys.map((y) => y.infrastructureCost), agentRun: ys.map((y) => y.runTeamCost),
  run: ys.map((y) => y.totalRunCost), savings: ys.map((y) => y.savings), humanFte: ys.map((y) => y.humanFteEnd), agentVfte: ys.map((y) => y.agentVfteEnd),
});

export const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
export const avg = (a: number[]): number => sum(a) / a.length;

/** Cumulative cash-flow after setup and after each year: [-setup, -setup + s1, ...] (the P&L chart series). */
export function cashSteps(savings: number[], setup: number): number[] {
  let c = -setup;
  return [c, ...savings.map((s) => (c += s))];
}

export interface FtePoint { month: number; human: number; agent: number }

/** Human FTE / agent vFTE sampled about every months/20 (month 0 = the AS-IS team), for the workforce-shift chart. */
export function ftePoints(v: EconomicsView): FtePoint[] {
  const months = v.m.horizon * 12, step = Math.max(1, Math.floor(months / 20)), out: FtePoint[] = [];
  for (let mo = 0; mo <= months; mo += step) {
    if (mo === 0) out.push({ month: 0, human: v.baseFte, agent: 0 });
    else { const r = v.eng.monthAt(mo); out.push({ month: mo, human: r.humanFte, agent: r.agentVfte }); }
  }
  return out;
}
