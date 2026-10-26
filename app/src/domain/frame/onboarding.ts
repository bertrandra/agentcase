/** @calc-zone delivery-views */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { fteAtMonth } from '../economics/fte';
import { model } from '../model/overlay';
import { rampAt } from '../time/adapters';

/** Defaults of the four client-facing stages (weeks): Discover, Calibrate, Validate, Pilot & Prove. */
export const STAGE_DEFAULTS = [4, 4, 4, 6];
export const stageWeeks = (c: Ctx): number[] => STAGE_DEFAULTS.map((d, i) => c.inp.p('rmD' + (i + 1)) || d);
const DAY = 86400000, iso = (d: Date) => d.toISOString().slice(0, 10);
export function startDate(c: Ctx): Date {
  const d = new Date(c.inp.v('rmStart') || '2026-09-01');
  return isNaN(d.getTime()) ? new Date('2026-09-01') : d;
}

export interface OnboardingBand { totalWeeks: number; months: string; pilotStart: string; decide: string }
/** "Runway to decision" strip of the Engage section. */
export function onboardingBand(c: Ctx): OnboardingBand {
  const dw = stageWeeks(c), tot = dw[0]! + dw[1]! + dw[2]! + dw[3]!, t0 = startDate(c).getTime();
  return { totalWeeks: tot, months: (tot / 4.345).toFixed(1), pilotStart: iso(new Date(t0 + (dw[0]! + dw[1]! + dw[2]!) * 7 * DAY)),
    decide: iso(new Date(t0 + tot * 7 * DAY)) };
}

export interface RoadmapStage { name: string; label: string; gate: string; section: string; from: string; to: string | null; current: boolean }
const STAGES = [
  { name: '0 · Discover', label: 'Framing, AS-IS baseline, eligibility', gate: 'Baseline validated + eligibility', section: 'engagement-context' },
  { name: '1 · Calibrate', label: 'Sector coefficients, artifact scope frozen', gate: 'Scope & coefficients frozen', section: 'scope-sel' },
  { name: '2 · Validate', label: 'Assumptions signed, Monte Carlo run', gate: 'Assumptions register signed · P50 > threshold', section: 'montecarlo' },
  { name: '3 · Pilot & Prove', label: 'Pilot pods, KPI tracking', gate: 'Pilot KPIs ≥ 80% of Y1 targets', section: 'kpi' },
  { name: '4 · Decide & Scale', label: 'Scale-out per Decision Intelligence', gate: 'Verdict ≥ Conditional GO', section: 'decision' },
];
/** The five gated stages on the calendar; `today` marks the current one (before the start date: none, after the last window: the last). */
export function roadmapStages(c: Ctx, today: Date): RoadmapStage[] {
  const dw = stageWeeks(c);
  let t = startDate(c).getTime(), cur = 4;
  const out = STAGES.map((s, i) => {
    const from = new Date(t), to = i < 4 ? new Date(t + dw[i]! * 7 * DAY) : null;
    if (today < from && i === 0) cur = -1;
    if (to && today >= from && today < to) cur = i;
    if (to) t = to.getTime();
    return { ...s, from: iso(from), to: to ? iso(to) : null, current: false };
  });
  out.forEach((s, i) => { s.current = i === cur; });
  return out;
}

export interface PlannedQuarter { label: string; ad: number; freed: number; savPlan: number }
/**
 * Plan per quarter over the whole horizon: effective adoption at mid-quarter, FTE freed at the same month (the FTE owner `fteAtMonth`: entry team
 * minus delivery team and agentic run team), cumulative savings (legacy plannedQuarters, whose freed was entry team × adoption).
 */
export function plannedQuarters(c: Ctx): PlannedQuarter[] {
  const m = model(c), eng = engineNow(c), n = Math.max(1, eng.horizonYears * 4), q: PlannedQuarter[] = [];
  let cum = 0, month = 0;
  for (let i = 1; i <= n; i++) {
    const t = Math.min(eng.horizonMonths, Math.max(1, (i - 1) * 3 + 1.5)), r = rampAt(t, eng.K) / 100, ad = r * m.eff;
    for (const upto = Math.min(i * 3, eng.horizonMonths); month < upto;) cum += eng.monthAt(++month).grossSavings || 0;
    q.push({ label: 'Q' + i, ad: Math.round(ad * 10) / 10, freed: Math.round(fteAtMonth(c, t).freed * 10) / 10, savPlan: Math.round(cum) });
  }
  return q;
}

export interface TrackActual { ad: number | null; fte: number | null; sav: number | null }
/** A quarter's status from its recorded adoption: on / ahead of the plan, behind it, or null (nothing recorded). The one rule `trackStatus` counts. */
export const quarterStatus = (q: PlannedQuarter, a: TrackActual | undefined): 'ahead' | 'behind' | null =>
  (a?.ad == null ? null : a.ad >= q.ad ? 'ahead' : 'behind');
/** Overall tracker status from the recorded actuals (only quarters inside the horizon count). */
export function trackStatus(q: PlannedQuarter[], actuals: Record<string, TrackActual | undefined>) {
  const rows = Object.entries(actuals).map(([k, a]) => ({ i: parseInt(k.slice(1), 10) - 1, a })).filter((x) => x.i >= 0 && x.i < q.length && x.a);
  const filled = rows.filter((x) => quarterStatus(q[x.i]!, x.a) != null).length, behind = rows.filter((x) => quarterStatus(q[x.i]!, x.a) === 'behind').length;
  const [head, tone] = filled === 0 ? ['Not started — enter actuals to track', 'grey'] as const
    : behind === 0 ? ['On track — actuals meet or exceed the plan', 'teal'] as const
    : behind < filled / 2 ? [`Mostly on track — ${behind} quarter(s) behind`, 'amber'] as const : ['Behind plan — steer required', 'brick'] as const;
  return { head, tone, filled, total: q.length, latest: q[q.length - 1]!.ad };
}
