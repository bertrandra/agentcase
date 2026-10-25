/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { engineNow, paybackMonthsCanonical } from '../canonical';
import { model } from '../model/overlay';
import { velocityUpliftPct } from '../verifyB/velocityUplift';

export interface Story {
  baseFte: number; tgtFte: number; velocityPct: number; baselineRun: number; endRun: number; endSavings: number;
  payback: number | null; horizon: number; endLabel: string;
}

/** One-page AS-IS -> TO-BE narrative figures (legacy renderStorySummary). */
export function storySummary(c: Ctx): Story {
  const m = model(c), ys = engineNow(c).years(), e = ys[ys.length - 1]!;
  return { baseFte: m.base.etp, tgtFte: e.totalHumanFteEnd, velocityPct: velocityUpliftPct(c), baselineRun: m.baselineRun, endRun: e.totalRunCost,
    endSavings: e.savings,
    payback: paybackMonthsCanonical(c), horizon: m.horizon, endLabel: `Y${ys.length}` };
}
