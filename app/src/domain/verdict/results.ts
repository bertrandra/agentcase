/** @calc-zone verdict */
import { engineNow } from '../canonical';
import { caseFte } from '../economics/fte';
import { headline, paybackYearShown } from '../economics/headline';
import { fmtPaybackYear, fmtRoiPct } from '../economics/roi';
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { savingsBreakdown as economicsSavings, type SavingsYear } from '../economics/savings';
import { lifecycleStatusLabel } from './context';

export type { SavingsYear };
/**
 * Human → agent team shift at the horizon end, on the one FTE definition (`caseFte`): AS-IS FTE, residual human FTE (= `fte.after`, delivery team +
 * agentic run team, split in `delivery` and `runTeam`) and agent vFTE, all from the Time Engine end-year row.
 */
export interface TeamShift { asis: number; human: number; delivery: number; runTeam: number; agent: number }

/** Yearly savings decomposition: the economics owner's years (`model` is the Time-Engine savings of the year, `other` the gap to it). */
export const savingsBreakdown = (c: Ctx): SavingsYear[] => economicsSavings(c).years;

/** Human → agent team shift at the horizon end (the Time Engine end-year row, the FTE owner's definition). */
export function teamShift(c: Ctx): TeamShift {
  const ys = engineNow(c).years(), last = ys[ys.length - 1], f = caseFte(c);
  return { asis: f.before, human: f.after, delivery: last?.humanFteEnd ?? f.before, runTeam: last?.runTeamFteEnd ?? 0, agent: last?.agentVfteEnd ?? 0 };
}

export interface ResultsCore {
  net: number; roi: number | null; roiText: string; payback: string; horizon: number; setup: number; eff: number; status: string; last: SavingsYear;
  team: TeamShift;
}

/** The deterministic part of the Results screen: net benefit, ROI, payback year, depth, savings decomposition and team shift. */
export function resultsCore(c: Ctx): ResultsCore {
  const m = model(c), h = headline(c), sb = savingsBreakdown(c);
  return { net: h.net, roi: h.roi, roiText: fmtRoiPct(h.roi), payback: fmtPaybackYear(paybackYearShown(h)), horizon: m.horizon, setup: h.setup, eff: m.eff,
    status: lifecycleStatusLabel(c.s), last: sb[sb.length - 1] as SavingsYear, team: teamShift(c) };
}
