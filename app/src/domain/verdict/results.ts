/** @calc-zone verification-verdict */
import { engineNow } from '../canonical';
import { headline } from '../economics/headline';
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { savingsBreakdown as economicsSavings, type SavingsYear } from '../economics/savings';
import { lifecycleStatusLabel } from './context';

export type { SavingsYear };
export interface TeamShift { asis: number; human: number; agent: number }

/** Yearly savings decomposition: the economics owner's years (reconciles to the model's yearly savings, legacy savingsBreakdown). */
export const savingsBreakdown = (c: Ctx): SavingsYear[] => economicsSavings(c).years;

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
