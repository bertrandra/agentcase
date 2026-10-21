import type { Ctx } from '../ctx';
import { modelRaw } from '../model/raw';
import type { ModelResult } from '../types/model';
import { roiCanonical } from '../economics/roi';
import { buildK, econ, type K } from './kernel';

export interface ThinYear { savings: number; totalRunCost: number; teamCost: number; tokenCost: number }
export interface ThinResult { npv: number; payback: number | null; roi: number | null; totalSavings: number; years: ThinYear[]; inputHash: string }

/**
 * Thin mode (legacy TIME.thin, spec §16.2): one forward pass over the months, no row objects, no memo arrays — what Monte Carlo
 * calls once per draw. Same kernel (`econ`) as the full engine, so its totals equal the deterministic headline.
 */
export function thinAggregate(K: K, annualRate?: number | null): ThinResult {
  const N = K.horizonMonths, nY = K.horizonYears, dr = (annualRate == null ? 0.08 : annualRate) / 12;
  let cum = 0, payback: number | null = null, npv = 0, totalNet = 0;
  const ySav = new Float64Array(nY), yRun = new Float64Array(nY), yTeam = new Float64Array(nY), yTok = new Float64Array(nY);
  for (let t = 1; t <= N; t++) {
    const e = econ(t, K);
    cum += e.netSav;
    if (payback === null && cum >= 0) payback = t;
    npv += e.netSav / Math.pow(1 + dr, t);
    totalNet += e.netSav;
    const y = Math.min(nY - 1, Math.floor((t - 1) / 12));
    ySav[y] = (ySav[y] as number) + e.grossSav; yRun[y] = (yRun[y] as number) + e.totalRun;
    yTeam[y] = (yTeam[y] as number) + e.teamCost; yTok[y] = (yTok[y] as number) + e.tokenCost;
  }
  const years: ThinYear[] = [];
  for (let y = 0; y < nY; y++) years.push({ savings: ySav[y] as number, totalRunCost: yRun[y] as number, teamCost: yTeam[y] as number, tokenCost: yTok[y] as number });
  return { npv, payback, roi: roiCanonical(totalNet, K.setupTotal), totalSavings: totalNet, years, inputHash: K.inputHash };
}

/** Thin aggregate of a case on the live curve; `model` must be a RAW model (never the curve overlay). */
export function thinFor(c: Ctx, opts: { curveModelId: string; model?: ModelResult; mode?: string }, annualRate?: number | null): ThinResult {
  return thinAggregate(buildK(c, opts.model ?? modelRaw(c), { mode: opts.mode ?? 'full', curveModelId: opts.curveModelId }), annualRate);
}
