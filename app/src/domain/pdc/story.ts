/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { engineNow } from '../canonical';
import { displayedPayback } from '../economics/cashflow';
import { headline } from '../economics/headline';
import { caseFte } from '../economics/fte';
import { model } from '../model/overlay';
import { velocityUpliftPct } from '../verifyB/velocityUplift';

export interface Story {
  baseFte: number; tgtFte: number; velocityPct: number; baselineRun: number; endRun: number; endSavings: number;
  payback: number | null; horizon: number; endLabel: string;
}

/** The displayed payback month of the case (`displayedPayback`: 0 = immediate when there is no setup, null = beyond the horizon). */
const storyPayback = (c: Ctx): number | null => { const h = headline(c); return displayedPayback(h.paybackMonth, h.setup, h.totalBenefit); };

/** One-page AS-IS -> TO-BE narrative figures (legacy renderStorySummary). */
export function storySummary(c: Ctx): Story {
  const m = model(c), ys = engineNow(c).years(), e = ys[ys.length - 1]!;
  const f = caseFte(c);
  return { baseFte: f.before, tgtFte: f.after, velocityPct: velocityUpliftPct(c), baselineRun: m.baselineRun, endRun: e.totalRunCost,
    endSavings: e.savings,
    payback: storyPayback(c), horizon: m.horizon, endLabel: `Y${ys.length}` };
}
