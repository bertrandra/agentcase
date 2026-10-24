/** @calc-zone time-engine */
import type { Ctx } from './ctx';
import { DEFAULT_DISCOUNT_RATE } from './economics/cashflow';
import { clamp, numOr } from './model/modelState';
import { modelRaw } from './model/raw';
import { activeCurve } from './model/overlay';
import { timeFor, type Engine } from './time';

/** Engine on the live curve, built from the raw model (legacy teEngineNow()). */
const engines = new WeakMap<Ctx, Engine>();
export function engineNow(c: Ctx): Engine {
  let e = engines.get(c);
  if (!e) { e = timeFor(c, { mode: 'full', curveModelId: activeCurve(c), model: modelRaw(c) }); engines.set(c, e); }
  return e;
}

/** The case's annual discount rate (MODEL.CASE.discountRate clamped to [0, 1]; `DEFAULT_DISCOUNT_RATE` when unset or not finite). */
export const caseDiscountRate = (c: Ctx): number => clamp(numOr(c.s.MODEL?.CASE?.discountRate, DEFAULT_DISCOUNT_RATE), 0, 1);

/** Canonical payback month (1-based) or null. */
export const paybackMonthsCanonical = (c: Ctx): number | null => engineNow(c).payback();

/** Canonical NPV at the case discount rate (or at an explicit annual rate). */
export const npvCanonical = (c: Ctx, annualRate?: number): number => engineNow(c).npv(annualRate ?? caseDiscountRate(c));
