/** @calc-zone time-engine */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { model } from './overlay';

/** Wedge (€) above which the attributable savings are flagged as overstated by the gross figure. */
export const WEDGE_FLAG_EUR = 1;

export interface DriftRow { year: number; label: string; gross: number; attributable: number; wedge: number; flagged: boolean }

/**
 * Counterfactual baseline drift, one row per horizon year of the Time Engine: gross savings (the engine year's savings, the figure of Annual /
 * Financial), the attributable part once the secular drift δ of the baseline is removed (attributable = gross − (baseline − baseline·(1−δ)^y)) and
 * the wedge between them. δ is 0 when the phase is off, so attributable = gross.
 */
export function driftRows(c: Ctx): DriftRow[] {
  const m = model(c), delta = m.cbd.delta || 0;
  return engineNow(c).years().map((y, i) => {
    const attributable = y.savings - (m.baselineRun - m.baselineRun * Math.pow(1 - delta, i + 1)), wedge = y.savings - attributable;
    return { year: i + 1, label: `Y${i + 1}`, gross: y.savings, attributable, wedge, flagged: wedge > WEDGE_FLAG_EUR };
  });
}
