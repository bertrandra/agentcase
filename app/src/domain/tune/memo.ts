/** @calc-zone tuning-programme */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';

/** model() and the Time Engine are cached per context at their source (overlay.ts / canonical.ts); these are the tune-side names. */
export const modelOf = model;
export const engineOf = engineNow;
/** teEndYear(): horizon in years (3 when the engine cannot be built, like the legacy try/catch). */
export function endYear(c: Ctx): number {
  try { return engineOf(c).horizonYears; } catch { return 3; }
}
/** teEndYearRow(): the engine's aggregate of the last horizon year. */
export function endYearRow(c: Ctx) {
  const e = engineOf(c);
  return e.year(e.horizonYears);
}
