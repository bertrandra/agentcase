import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { engineNow } from '../canonical';

export interface SavingsYear {
  /** value of the heads removed, priced at the AS-IS blended rate */
  grossAuto: number;
  /** tokens + infrastructure + agentic run team */
  agentCost: number;
  /** residual team priced at (AS-IS rate - target rate) */
  relocation: number;
  netAuto: number;
  total: number;
  /** the Time-Engine savings of the year, for reconciliation */
  model: number;
}
export interface SavingsBreakdown { years: SavingsYear[]; asis: number; tgt: number; wd: number; baseEtp: number }

/**
 * Split of the savings into automation and relocation components (legacy savingsBreakdown(), v12.11).
 * NB: the components are priced on the flat annual model, so `total` does NOT equal `model` (the Time-Engine savings) under
 * a non-legacy curve; the legacy screen prints both side by side and so do we.
 */
export function savingsBreakdown(c: Ctx): SavingsBreakdown {
  const m = model(c), wd = m.wd, asis = m.blendedTJM, tgt = m.tgtTJM, baseEtp = m.base.etp;
  const years = engineNow(c).years().map((y) => {
    const grossAuto = (baseEtp - y.humanFteEnd) * asis * wd;
    const agentCost = (y.tokenCost || 0) + (y.infrastructureCost || 0) + (y.runTeamCost || 0);
    const relocation = y.humanFteEnd * wd * (asis - tgt);
    return { grossAuto, agentCost, relocation, netAuto: grossAuto - agentCost, total: grossAuto - agentCost + relocation, model: y.savings };
  });
  return { years, asis, tgt, wd, baseEtp };
}
