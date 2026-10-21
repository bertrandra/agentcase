import { ENGAGE_COEF } from './catalog';
import type { Ctx } from './ctx';
import { teamInCost } from './location';
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

export function hriIntensity(c: Ctx): 'light' | 'standard' | 'intensive' {
  const x = hriIndex(c);
  return x >= 75 ? 'light' : x >= 50 ? 'standard' : 'intensive';
}

export function hriCostPerFTE(c: Ctx): number {
  const it = hriIntensity(c);
  const v = it === 'light' ? c.inp.p('hriCostLight') : it === 'standard' ? c.inp.p('hriCostStd') : c.inp.p('hriCostInt');
  return isNaN(v) ? (it === 'light' ? 1200 : it === 'standard' ? 3000 : 5500) : v;
}

export const convChangeCost = (c: Ctx): number => (hriEnabled(c) ? teamInCost(c.s, c.inp).etp * hriCostPerFTE(c) : 0);

/** Adoption drag from low readiness (1 when the HRI module is off). */
export function hriRampFactor(c: Ctx): number {
  if (!hriEnabled(c)) return 1;
  const { hriFloor = 0, hriSlope = 0 } = c.s.COEF;
  return Math.max(hriFloor, hriFloor + (hriSlope * hriIndex(c)) / 100);
}
