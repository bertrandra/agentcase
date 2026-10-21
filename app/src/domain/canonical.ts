import type { Ctx } from './ctx';
import { modelRaw } from './model/raw';
import { activeCurve } from './model/overlay';
import { timeFor } from './time';

/** Engine on the live curve, built from the raw model (legacy teEngineNow()). */
export const engineNow = (c: Ctx) => timeFor(c, { mode: 'full', curveModelId: activeCurve(c), model: modelRaw(c) });

/** Canonical payback month (1-based) or null. */
export const paybackMonthsCanonical = (c: Ctx): number | null => engineNow(c).payback();

/** Canonical NPV at the case discount rate (MODEL.CASE.discountRate, else 8 %). */
export function npvCanonical(c: Ctx, annualRate?: number): number {
  const d = c.s.MODEL?.CASE?.discountRate;
  return engineNow(c).npv(annualRate == null ? (typeof d === 'number' ? d : 0.08) : annualRate);
}
