/** @calc-zone economics-headline */
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
  /** what the decomposition does not price (= model − total): the within-year adoption ramp and the engine overlays (KT, taxes, rework) */
  other: number;
}
export interface SavingsBreakdown {
  years: SavingsYear[]; asis: number; tgt: number; wd: number; baseEtp: number;
  /** the target blended rate is within `RATE_NEUTRAL_EUR` of the AS-IS blend: relocation is near-neutral */
  relocationNeutral: boolean;
  /** the last year's components add up to the Time-Engine savings within `RECONCILE_EUR` */
  reconciles: boolean;
}

/** Day-rate gap (€/day) under which the relocation component reads as near-neutral. */
export const RATE_NEUTRAL_EUR = 0.5;
/** Gap (€) under which the decomposition reconciles with the Time-Engine savings. */
export const RECONCILE_EUR = 1;

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
    const total = grossAuto - agentCost + relocation;
    return { grossAuto, agentCost, relocation, netAuto: grossAuto - agentCost, total, model: y.savings, other: y.savings - total };
  });
  const last = years[years.length - 1];
  return { years, asis, tgt, wd, baseEtp, relocationNeutral: Math.abs(asis - tgt) <= RATE_NEUTRAL_EUR,
    reconciles: !last || Math.abs(last.total - last.model) <= RECONCILE_EUR };
}
