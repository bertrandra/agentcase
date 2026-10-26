/** @calc-zone scope-automation */
import { ENGAGE_COEF } from './catalog';
import type { Ctx } from './ctx';
import type { EngageCoefRow } from './types/state';

export function engagementKey(c: Ctx): string {
  const v = c.inp.v('engagementCtx');
  return (c.s.engageCoef ?? ENGAGE_COEF)[v] ? v : 'MSC';
}

export function engagementCoef(c: Ctx): EngageCoefRow {
  return (c.s.engageCoef ?? ENGAGE_COEF)[engagementKey(c)] as EngageCoefRow;
}

export const hriEnabled = (c: Ctx): boolean => c.inp.c('hriEnabled');

/** Human Readiness Index 0..100 from the 18 answers (missing answers count as 2). */
export function hriIndex(c: Ctx): number {
  let sum = 0;
  for (let i = 0; i < 18; i++) { let v = c.inp.p('hriQ' + i); if (isNaN(v)) v = 2; sum += v; }
  return (sum / (18 * 4)) * 100;
}

/** Lower bounds of the HRI bands: 75+ light change (ready), 50–74 standard (fragile), below 50 intensive (at risk). */
export const HRI_LIGHT = 75, HRI_STANDARD = 50;
export type HriBand = 'light' | 'standard' | 'intensive';
/** Band of an HRI value: the one rule behind the change intensity, its cost per FTE and the read-out tone. */
export const hriBandOf = (x: number): HriBand => (x >= HRI_LIGHT ? 'light' : x >= HRI_STANDARD ? 'standard' : 'intensive');

export function hriIntensity(c: Ctx): HriBand {
  return hriBandOf(hriIndex(c));
}

export function hriCostPerFTE(c: Ctx): number {
  const it = hriIntensity(c);
  const v = it === 'light' ? c.inp.p('hriCostLight') : it === 'standard' ? c.inp.p('hriCostStd') : c.inp.p('hriCostInt');
  return isNaN(v) ? (it === 'light' ? 1200 : it === 'standard' ? 3000 : 5500) : v;
}


/** Adoption drag from low readiness (1 when the HRI module is off). */
export function hriRampFactor(c: Ctx): number {
  if (!hriEnabled(c)) return 1;
  const { hriFloor = 0, hriSlope = 0 } = c.s.COEF;
  return Math.max(hriFloor, hriFloor + (hriSlope * hriIndex(c)) / 100);
}
