import type { Ctx } from '../ctx';
import { engineNow, paybackMonthsCanonical } from '../canonical';
import { model } from '../model/overlay';
import { perfRel } from './perf';

export interface Story {
  baseFte: number; tgtFte: number; velocityPct: number; baselineRun: number; endRun: number; endSavings: number;
  payback: number | null; horizon: number; endLabel: string;
}

/** One-page AS-IS -> TO-BE narrative figures (legacy renderStorySummary). */
export function storySummary(c: Ctx): Story {
  const m = model(c), ys = engineNow(c).years(), e = ys[ys.length - 1]!;
  const velocityPct = Math.round((Math.round(35 + (59 - 35) * perfRel(c, e.adoptionEndPct)) - 35) / 35 * 100);
  return { baseFte: m.base.etp, tgtFte: e.totalHumanFteEnd, velocityPct, baselineRun: m.baselineRun, endRun: e.totalRunCost, endSavings: e.savings,
    payback: paybackMonthsCanonical(c), horizon: m.horizon, endLabel: `Y${ys.length}` };
}
