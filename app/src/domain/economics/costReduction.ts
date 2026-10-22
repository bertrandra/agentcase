/** @calc-zone economics-headline @owner saving-pct */
import type { Ctx } from '../ctx';
import { horizonYears } from '../model/horizonYears';
import { model } from '../model/overlay';

/**
 * Net cost reduction over the project horizon (legacy `costReduction3y`, generalised to the case horizon): the saving over the
 * horizon, setup included as real spend, as a share of the AS-IS baseline cost over the same years. Not ROI (that divides by the investment).
 * `gross` leaves the setup out. `ok` is false when there is no baseline cost.
 */
export function costReduction(c: Ctx) {
  const m = model(c), hy = horizonYears(c), years = hy.sav.length, base = (+m.baselineRun || 0) * years;
  const sav = hy.sav.reduce((a, b) => a + b, 0), setup = +m.setupTotal || 0;
  if (!(base > 0)) return { years, net: 0, gross: 0, base, tobe: 0, setup, ok: false };
  return { years, net: (sav - setup) / base, gross: sav / base, base, tobe: base - sav + setup, setup, ok: true };
}
