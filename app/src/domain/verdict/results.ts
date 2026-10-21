import { horizonYears } from '../model/horizonYears';
import { engineNow } from '../canonical';
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
  const m = model(c), ys = engineNow(c).years(), sb = savingsBreakdown(c);
  let net = 0;
  horizonYears(c).sav.forEach((v) => { net += v; });   // one entry per horizon year (legacy v18.13)
  net -= m.setupTotal;
  let cum = -m.setupTotal, payback = '—';
  for (let y = 0; y < ys.length; y++) { cum += (ys[y] as { savings: number }).savings; if (cum > 0) { payback = `Year ${y + 1}`; break; } }
  return { net, roi: m.setupTotal > 0 && isFinite(net) ? net / m.setupTotal : null, payback, horizon: m.horizon, setup: m.setupTotal, eff: m.eff,
    status: lifecycleStatusLabel(c.s), last: sb[sb.length - 1] as SavingsYear, team: teamShift(c) };
}
