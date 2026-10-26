/** @calc-zone tuning-programme */
import type { Ctx } from '../ctx';
import type { ModelResult } from '../types/model';
import { maturityInfo } from './maturity';
import { endYear, endYearRow, modelOf } from './memo';

/** The EV-09 ratios: AI reviewers per pod (1 up to L2, 0.5 from L3), pods per preceptor (3 in Y1, 6 later) and per agent architect (5). */
export const OM_RATIO = { reviewerUpToL2: 1, reviewerFromL3: 0.5, podsPerPreceptorY1: 3, podsPerPreceptorLater: 6, podsPerArchitect: 5 } as const;
export const reviewersPerPod = (lvl: number): number => (lvl <= 2 ? OM_RATIO.reviewerUpToL2 : OM_RATIO.reviewerFromL3);

export interface Topology {
  pod: number; basePod: number; widened: boolean; pods: number; orch: number; rev: number; prec: number; arch: number; finops: number;
  da: number; lead: number; eng: number; residual: number; ops: number; total: number; ok: boolean; lvl: number;
  /** engineers shown in the topology: the remainder, never negative (`eng` can be when the structure does not fit) */
  engShown: number;
}

/**
 * EV-09 team topology of year index `yi` (0 = Y1): the residual team re-labelled into pods + transverse roles + AI Office.
 * The pod size widens (up to 300 steps) until the residual can absorb the structure, so CC-OM-01 stays feasible.
 */
export function opModelCompute(c: Ctx, yi: number, m: ModelResult = modelOf(c)): Topology {
  let resid = m.yearETP[yi], ops = m.yearRunAgenticETP[yi];
  if (resid == null) { try { const e = endYearRow(c); resid = e.humanFteEnd; ops = e.runTeamFteEnd; } catch { /* keep zeros */ } }
  const residual = resid || 0, opsFte = ops || 0, total = residual + opsFte, lvl = maturityInfo(c, m).capped;
  const revPerPod = reviewersPerPod(lvl), basePod = Math.max(2, Math.min(4, c.inp.p('omPodSize') || 3));
  let pod = basePod, pods = 1, orch = 0, rev = 0, prec = 0, arch = 0, finops = 0, da = 0, lead = 0, eng = 0;
  for (let g = 0; g < 300; g++) {
    pods = Math.max(1, Math.ceil(residual / pod));
    orch = pods; rev = pods * revPerPod;
    prec = pods / (yi === 0 ? OM_RATIO.podsPerPreceptorY1 : OM_RATIO.podsPerPreceptorLater); arch = pods / OM_RATIO.podsPerArchitect;
    finops = yi === 0 ? 0.5 : 0.25; da = 0.5; lead = pods >= 4 ? 1 : 0.5;
    eng = residual - orch - rev - (prec + arch) - (finops + da + lead);
    if (eng >= 0 || pods <= 1) break;
    pod += 1;
  }
  return { pod, basePod, widened: pod > basePod, pods, orch, rev, prec, arch, finops, da, lead, eng, residual, ops: opsFte, total, ok: eng >= 0, lvl,
    engShown: Math.max(0, eng) };
}

/** Volume reconciliation Δ: |sum of the roles - residual| (CC-OM-01 holds when ≤ 2 % of the residual). */
export const reconDelta = (o: Topology): number => Math.abs(o.orch + o.rev + o.eng + o.prec + o.arch + o.finops + o.da + o.lead - o.residual);

export interface OpModelView { y1: Topology; yN: Topology; ok: boolean; endLabel: string; baseEtp: number }
export function opModelView(c: Ctx): OpModelView {
  const m = modelOf(c), n = endYear(c), y1 = opModelCompute(c, 0, m), yN = opModelCompute(c, n - 1, m);
  const ok = y1.ok && yN.ok && reconDelta(y1) < 0.02 * Math.max(1, y1.residual) && reconDelta(yN) < 0.02 * Math.max(1, yN.residual);
  return { y1, yN, ok, endLabel: `Y${n}`, baseEtp: m.base.etp };
}
