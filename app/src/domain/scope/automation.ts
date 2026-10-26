/** @calc-zone delivery-views */
import { crossingLabel, rampBoundsOf } from '../maturityBounds';
import { targetTeam } from '../verifyA/targetTeam';
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import type { Engine } from '../time';
import type { ModelResult } from '../types/model';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** The case's adoption-axis maturity bounds (`rampBoundsOf`, the one owner). */
export const maturityBounds = (c: Ctx): number[] => rampBoundsOf(c.s);

/** Model + Time Engine of a case: the shared source of the "automation over time" chart and the glass-ceiling funnel. */
export interface AutoBase { m: ModelResult; eng: Engine; N: number; endLabel: string }
export function autoBase(c: Ctx): AutoBase {
  const eng = engineNow(c);
  return { m: model(c), eng, N: Math.max(1, eng.horizonMonths), endLabel: `Y${eng.horizonYears}` };
}

/** Residual human team at the horizon end: delivery / supervision and the agentic run team on top (the verify owner `targetTeam`). */
export function teamSplit(c: Ctx, b: AutoBase) {
  const t = targetTeam({ c, m: b.m, eng: b.eng });
  return { devETP: t.devETP, supETP: t.supETP, runETP: t.runETP };
}

export interface AutomationCurve {
  N: number; endLabel: string; auto: number; eff: number; ceilLoss: number; manual: number; rampEnd: number; realEnd: number; adoptGapEnd: number;
  real: number[]; human: number[]; manualWork: number[]; vfte: number[]; humanEnd: number; residEndPct: number; manualEndPct: number;
  vfteEndFte: number; vfteShareEnd: number; team: { devETP: number; supETP: number; runETP: number };
  levels: { lvl: string; th: number; month: number | null }[];
  /** the adoption gap is closed at the horizon end (at most `FUNNEL_EPS` points) */
  gapClosed: boolean;
  /** the maturity thresholds the curve crosses, for the legend ("25 / 55 / 80%": the case's editable bounds) */
  levelsLabel: string;
}

/** Everything the "Automation over time" chart draws, per month 1..N (legacy renderAutomationCurve). Index 0 is month 1. */
export function automationCurve(c: Ctx, b: AutoBase = autoBase(c)): AutomationCurve {
  const { m, eng, N } = b, auto = clamp(m.auto, 0, 100), eff = clamp(m.eff, 0, auto);
  const ramp = (t: number) => eng.monthAt(t).adoptionRampPct, months = Array.from({ length: N }, (_, i) => i + 1);
  const real = months.map((t) => (eff * ramp(t)) / 100), rampEnd = ramp(N), realEnd = (eff * rampEnd) / 100;
  const baseEtp = m.base.etp || 1, endRow = eng.year(eng.horizonYears), humanEnd = endRow.totalHumanFteEnd;
  const residEndPct = clamp((humanEnd / baseEtp) * 100, 0, 100), vfteEndFte = endRow.agentVfteEnd;
  const vfteShareEnd = clamp(humanEnd + vfteEndFte > 0 ? (vfteEndFte / (humanEnd + vfteEndFte)) * 100 : 0, 0, 100);
  return {
    N, endLabel: b.endLabel, auto, eff, ceilLoss: auto - eff, manual: 100 - auto, rampEnd, realEnd, adoptGapEnd: eff - realEnd, real,
    human: real.map((r) => (realEnd > 0.01 ? 100 - (100 - residEndPct) * (r / realEnd) : 100)),
    manualWork: real.map((r) => 100 - r), vfte: real.map((r) => (realEnd > 0.01 ? vfteShareEnd * (r / realEnd) : 0)),
    humanEnd, residEndPct, manualEndPct: clamp(100 - realEnd, 0, 100), vfteEndFte, vfteShareEnd, team: teamSplit(c, b),
    levels: maturityBounds(c).map((th, i) => ({ lvl: `L${i + 1}`, th, month: months.find((t) => ramp(t) >= th) ?? null })),
    gapClosed: eff - realEnd <= FUNNEL_EPS, levelsLabel: crossingLabel(maturityBounds(c)),
  };
}

/** One frame of the glass-ceiling funnel: what remains of the delivery work after each constraint (legacy afStages). */
export interface FunnelStage {
  t: number; N: number; v0: number; v1: number; v2: number; v3: number; v4: number; v5: number; ramp: number; yearIdx: number;
  /** points of the potential given back by all the constraints together (v1 − v5) */
  lost: number;
}
export function funnelStage(b: AutoBase, month: number | null): FunnelStage {
  const { m, eng, N } = b, t = Math.max(1, Math.min(N, month || N)), row = eng.monthAt(t), baseEtp = m.base.etp || 1;
  const v1 = clamp(m.auto, 0, 100), v5 = Math.max(0, row.realizedAutomationPct || 0);
  return { t, N, v0: 100, v1, v2: v1 * (1 - clamp(m.ceiling, 0, 100) / 100), v3: Math.max(0, Math.min(v1, row.effectiveAutomationPct)),
    v4: Math.max(0, ((row.agentVfteRaw || 0) / baseEtp) * 100), v5, ramp: row.adoptionRampPct || 0, yearIdx: row.yearIndex, lost: v1 - v5 };
}

export const FUNNEL_EPS = 0.05;
/** Which stages get a band: those that cost something at month 1, mid-horizon or at the end (decided once, never per frame). */
export function activeStages(b: AutoBase) {
  const probe = [1, Math.ceil(b.N / 2), b.N].map((t) => funnelStage(b, t)),
    bites = (pick: (s: FunnelStage) => number) => probe.some((s) => pick(s) > FUNNEL_EPS);
  return { ceiling: bites((s) => s.v1 - s.v2), mix: bites((s) => s.v2 - s.v3), ramp: bites((s) => s.v3 - s.v4), sup: bites((s) => s.v4 - s.v5) };
}

export type FunnelKey = 'scope' | 'potential' | 'ceiling' | 'mix' | 'ramp' | 'sup' | 'effective';
export interface FunnelLink { key: FunnelKey; v: number; before: number; loss: number; lost: boolean }
/** The stage chain of the funnel at one month: what remains after each active stage and the points lost there (more than `FUNNEL_EPS` = lost). */
export function funnelChain(S: FunnelStage, A: ReturnType<typeof activeStages>): FunnelLink[] {
  const steps: [FunnelKey, number][] = [['scope', S.v0], ['potential', S.v1]];
  if (A.ceiling) steps.push(['ceiling', S.v2]);
  if (A.mix) steps.push(['mix', S.v3]);
  if (A.ramp) steps.push(['ramp', S.v4]);
  if (A.sup) steps.push(['sup', S.v5]);
  steps.push(['effective', S.v5]);
  return steps.map(([key, v], i) => {
    const before = i === 0 ? v : (steps[i - 1] as [FunnelKey, number])[1], loss = before - v;
    return { key, v, before, loss, lost: loss > FUNNEL_EPS };
  });
}
