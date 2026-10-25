/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { engineNow } from '../canonical';
import { phaseScope, totalEffort } from '../scope';
import { numOr } from '../model/modelState';

const COEF_FALLBACK = { perfRelCap: 1.4, perfUpliftFactor: 0.85 };
/** Realisation coefficients, each falling back to its default when missing, undefined or not finite (never NaN). */
export const perfCoef = (c: Ctx) => ({ perfRelCap: numOr(c.s.COEF?.perfRelCap, COEF_FALLBACK.perfRelCap),
  perfUpliftFactor: numOr(c.s.COEF?.perfUpliftFactor, COEF_FALLBACK.perfUpliftFactor) });
export const yearLabel = (y: number): string => `Y${y}`;

/** Effort-weighted automatable baseline of the full SDLC scope (legacy refAvgAgent). */
export function refAvgAgent(c: Ctx): number {
  const t = totalEffort(c.a, c.s);
  return t ? c.a.sdlc.reduce((s, a) => s + (+a.w || 0) * a.agentSup, 0) / t : 0;
}

/** Relative uplift of the in-scope intensity at a ramp (%) against the full-scope calibration, clamped to [0, perfRelCap]. */
export function perfRel(c: Ctx, ramp: number): number {
  const k = perfCoef(c), d = (refAvgAgent(c) / 100) * k.perfUpliftFactor;
  const up = (phaseScope(c.a, c.s).avgAgent / 100) * (ramp / 100);
  return d ? Math.max(0, Math.min(k.perfRelCap, up / d)) : 0;
}

/** What every breakdown view reads: model, the Y1 / Y2 / horizon-end relative uplifts, the horizon-end year row and its label. */
export function perfFrame(c: Ctx) {
  const m = model(c), eng = engineNow(c), end = eng.year(eng.horizonYears);
  return { m, eng, end, endYear: eng.horizonYears, endL: yearLabel(eng.horizonYears), r1: perfRel(c, m.ramps[0] as number),
    r2: perfRel(c, m.ramps[1] as number), r3: perfRel(c, end.adoptionEndPct) };
}
export type PerfFrame = ReturnType<typeof perfFrame>;
