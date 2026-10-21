import type { Ctx } from './ctx';
import { clamp, numOr } from './model/modelState';
import { modelRaw } from './model/raw';
import { activeCurve } from './model/overlay';
import { timeFor } from './time';

/** Engine on the live curve, built from the raw model (legacy teEngineNow()). */
export const engineNow = (c: Ctx) => timeFor(c, { mode: 'full', curveModelId: activeCurve(c), model: modelRaw(c) });

/** The case's annual discount rate (MODEL.CASE.discountRate clamped to [0, 1]; 8 % when unset or not finite). The single owner of that default. */
export const caseDiscountRate = (c: Ctx): number => clamp(numOr(c.s.MODEL?.CASE?.discountRate, 0.08), 0, 1);

/** Canonical payback month (1-based) or null. */
export const paybackMonthsCanonical = (c: Ctx): number | null => engineNow(c).payback();

/** Canonical NPV at the case discount rate (or at an explicit annual rate). */
export const npvCanonical = (c: Ctx, annualRate?: number): number => engineNow(c).npv(annualRate ?? caseDiscountRate(c));
