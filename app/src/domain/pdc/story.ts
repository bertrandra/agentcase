import type { Ctx } from '../ctx';
import { engineNow, paybackMonthsCanonical } from '../canonical';
import { model } from '../model/overlay';
import { daGet, daVal } from '../verifyB/anchors';
import { perfRel } from '../verifyB/perf';

export interface Story {
  baseFte: number; tgtFte: number; velocityPct: number; baselineRun: number; endRun: number; endSavings: number;
  payback: number | null; horizon: number; endLabel: string;
}

/** One-page AS-IS -> TO-BE narrative figures (legacy renderStorySummary). */
export function storySummary(c: Ctx): Story {
  const m = model(c), ys = engineNow(c).years(), e = ys[ys.length - 1]!;
  const v0 = daGet(c.s, 'velocitySp').asis, velocityPct = v0 > 0 ? Math.round((Math.round(daVal(c.s, 'velocitySp', perfRel(c, e.adoptionEndPct))) - v0) / v0 * 100) : 0;
  return { baseFte: m.base.etp, tgtFte: e.totalHumanFteEnd, velocityPct, baselineRun: m.baselineRun, endRun: e.totalRunCost, endSavings: e.savings,
    payback: paybackMonthsCanonical(c), horizon: m.horizon, endLabel: `Y${ys.length}` };
}
