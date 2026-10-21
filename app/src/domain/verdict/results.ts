import { engineNow } from '../canonical';
import { headline } from '../economics/headline';
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { lifecycleStatusLabel } from './context';

export interface SavingsYear { grossAuto: number; agentCost: number; relocation: number; netAuto: number; total: number; model: number }
export interface TeamShift { asis: number; human: number; agent: number }

/** Savings split into gross automation, agent operating cost and relocation; reconciles to the model's yearly savings (legacy savingsBreakdown). */
export function savingsBreakdown(c: Ctx): SavingsYear[] {
  const m = model(c), wd = m.wd, asis = m.blendedTJM, tgt = m.tgtTJM, baseEtp = m.base.etp;
  return engineNow(c).years().map((y) => {
    const resid = y.humanFteEnd, grossAuto = (baseEtp - resid) * asis * wd;
    const agentCost = (y.tokenCost || 0) + (y.infrastructureCost || 0) + (y.runTeamCost || 0);
    const relocation = resid * wd * (asis - tgt);
    return { grossAuto, agentCost, relocation, netAuto: grossAuto - agentCost, total: grossAuto - agentCost + relocation, model: y.savings };
  });
}

/** Human → agent team shift at horizon end: AS-IS FTE, residual humans and agent vFTE (aggregate, no per-skill clamping). */
export function teamShift(c: Ctx): TeamShift {
  const m = model(c), asis = c.s.teamIn.reduce((s, r) => s + (+r.etp || 0), 0), ys = engineNow(c).years(), last = ys[ys.length - 1];
  const agent = asis * (((last?.adoptionEndPct ?? 0) / 100) * (m.eff / 100));
  return { asis, human: Math.max(0, asis - agent), agent };
}

export interface ResultsCore {
  net: number; roi: number | null; payback: string; horizon: number; setup: number; eff: number; status: string; last: SavingsYear; team: TeamShift;
}

/** The deterministic part of the Results screen: net benefit, ROI, payback year, depth, savings decomposition and team shift. */
export function resultsCore(c: Ctx): ResultsCore {
  const m = model(c), h = headline(c), sb = savingsBreakdown(c);
  return { net: h.net, roi: h.roi, payback: h.paybackYear == null ? '—' : `Year ${h.paybackYear}`, horizon: m.horizon, setup: m.setupTotal, eff: m.eff,
    status: lifecycleStatusLabel(c.s), last: sb[sb.length - 1] as SavingsYear, team: teamShift(c) };
}
