import type { Ctx } from '../ctx';
import { engineNow } from '../canonical';
import { engagementCoef } from '../engagement';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';
import type { ModelResult } from '../types/model';

/** Delivery + agentic run team FTE in year index y (legacy humanFte()). */
export const humanFte = (m: ModelResult, y: number): number => (m.yearETP[y] || 0) + (m.yearRunAgenticETP?.[y] || 0);

export interface TargetTeam { devETP: number; supETP: number; setupETP: number; runETP: number; residualETP: number; totalRecurrent: number; avgHumanSup: number; supShare: number }

/** Target team at the horizon end: residual split into development and supervision (no addition), plus the external agentic run team. */
export function targetTeam(c: Ctx): TargetTeam {
  const m = model(c), ys = engineNow(c).years(), residualETP = ys[ys.length - 1]!.humanFteEnd, act = activeArtefacts(c.a, c.s);
  const avgHumanSup = act.length ? act.reduce((s, a) => s + a.humanSup, 0) / act.length / 100 : 0.4;
  const supShare = Math.min(c.s.COEF.supShareCap as number, avgHumanSup * (c.s.COEF.supShareFactor as number)), supETP = residualETP * supShare;
  return { devETP: residualETP - supETP, supETP, setupETP: c.s.COEF.setupETP as number, runETP: m.runAgenticETP, residualETP, totalRecurrent: residualETP + m.runAgenticETP, avgHumanSup, supShare };
}

const lvl = (v: number, b: number[]): number => { let l = 1; for (let i = 1; i < b.length; i++) if (v >= b[i]!) l = i + 1; return l; };

export interface MaturityInfo { rampY3: number; share: number; lr: number; ls: number; raw: number; capped: number; cap: number }
/** Maturity level L1..L4 from the end-year adoption and the agent share of the workforce, capped by the engagement context. */
export function maturityInfo(c: Ctx, m: ModelResult = model(c)): MaturityInfo {
  const n = m.ramps.length - 1, ys = engineNow(c).years(), e = ys[ys.length - 1]!;
  let rampY3 = m.ramps[n]!, f = m.yearETP[n]!, v = m.yearAgentVfte[n]!;
  if (ys.length > 3) { rampY3 = e.adoptionEndPct; f = e.humanFteEnd; v = e.agentVfteEnd; }
  const share = f + v > 0 ? (v / (f + v)) * 100 : 0, mm = c.s.MATURITY_MAP as { rampBounds?: number[]; shareBounds?: number[] } | undefined;
  const lr = lvl(rampY3, mm?.rampBounds ?? [0, 25, 55, 80]), ls = lvl(share, mm?.shareBounds ?? [0, 10, 25, 45]), raw = Math.min(lr, ls), cap = engagementCoef(c).maturityCap;
  return { rampY3, share, lr, ls, raw, capped: Math.min(raw, cap), cap };
}

export interface OpModel { pod: number; pods: number; orch: number; rev: number; prec: number; arch: number; finops: number; da: number; lead: number; eng: number; residual: number; ops: number; ok: boolean; lvl: number }

/** Operating-model topology (pods, orchestrators, reviewers, engineers) for year index yi; the pod size widens until the engineers remainder is >= 0. */
export function opModelCompute(c: Ctx, m: ModelResult, yi: number): OpModel {
  let residual = m.yearETP[yi], ops = m.yearRunAgenticETP[yi];
  if (residual == null) { const ys = engineNow(c).years(), e = ys[ys.length - 1]!; residual = e.humanFteEnd; ops = e.runTeamFteEnd; }
  const res = residual || 0, lv = maturityInfo(c, m).capped, revPerPod = lv <= 2 ? 1 : 0.5, basePod = Math.max(2, Math.min(4, c.inp.p('omPodSize') || 3));
  let pod = basePod, o = { pods: 1, orch: 1, rev: 0, prec: 0, arch: 0, finops: 0, da: 0, lead: 0, eng: 0 };
  for (let g = 0; g < 300; g++) {
    const pods = Math.max(1, Math.ceil(res / pod)), prec = pods / (yi === 0 ? 3 : 6), arch = pods / 5, finops = yi === 0 ? 0.5 : 0.25, da = 0.5, lead = pods >= 4 ? 1 : 0.5;
    o = { pods, orch: pods, rev: pods * revPerPod, prec, arch, finops, da, lead, eng: res - pods - pods * revPerPod - (prec + arch) - (finops + da + lead) };
    if (o.eng >= 0 || pods <= 1) break;
    pod += 1;
  }
  return { pod, ...o, residual: res, ops: ops || 0, ok: o.eng >= 0, lvl: lv };
}
