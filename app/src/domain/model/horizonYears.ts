import type { Ctx } from '../ctx';
import { timeFor } from '../time';
import { activeCurve } from './overlay';
import { modelRaw } from './raw';

/**
 * Savings and run cost per horizon year of the case (legacy `horizonYears()`, v18.13). `model().yearSav` / `yearRun` hold three
 * entries whatever the horizon; under a real adoption curve the Time Engine has one row per horizon year, under the legacy flat
 * curve only the three anchor years exist. Equal to the old three-entry sums for horizons 1 to 3.
 */
export function horizonYears(c: Ctx): { sav: number[]; run: number[] } {
  const raw = modelRaw(c), curve = activeCurve(c);
  if (!curve.startsWith('legacy')) {
    try {
      const Y = timeFor(c, { mode: 'full', curveModelId: curve, model: raw }).years();
      return { sav: Y.map((y) => y.savings), run: Y.map((y) => y.totalRunCost) };
    } catch { /* overlay failed: the flat annual model stands */ }
  }
  const n = Math.min(raw.horizon, raw.yearSav.length);
  return { sav: raw.yearSav.slice(0, n), run: raw.yearRun.slice(0, n) };
}
