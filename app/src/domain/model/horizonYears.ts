/** @calc-zone time-engine */
import type { Ctx } from '../ctx';
import { timeFor } from '../time';
import { activeCurve } from './overlay';
import { modelRaw } from './raw';

/**
 * Savings and run cost per horizon year of the case (legacy `horizonYears()`, v18.13): the Time Engine's year rows, one per horizon year, on every
 * curve. The legacy flat curves are engine adapters too (DEV-LEGACY-CURVE-HORIZON: the legacy read the three-entry annual model under them, so a
 * 5-year case counted three years). `model().yearSav` / `yearRun` keep three entries whatever the horizon. The flat model stands only if the engine fails.
 */
export function horizonYears(c: Ctx): { sav: number[]; run: number[] } {
  const raw = modelRaw(c);
  try {
    const Y = timeFor(c, { mode: 'full', curveModelId: activeCurve(c), model: raw }).years();
    return { sav: Y.map((y) => y.savings), run: Y.map((y) => y.totalRunCost) };
  } catch { /* overlay failed: the flat annual model stands */ }
  const n = Math.min(raw.horizon, raw.yearSav.length);
  return { sav: raw.yearSav.slice(0, n), run: raw.yearRun.slice(0, n) };
}
