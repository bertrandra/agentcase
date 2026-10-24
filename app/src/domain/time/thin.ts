/** @calc-zone time-engine */
import type { Ctx } from '../ctx';
import { modelRaw } from '../model/raw';
import type { ModelResult } from '../types/model';
import { cashflowSummary, roiCanonical } from '../economics/cashflow';
import { buildK, econ, type K } from './kernel';

export interface ThinYear { savings: number; totalRunCost: number; teamCost: number; tokenCost: number }
export interface ThinResult { npv: number; payback: number | null; roi: number | null; totalSavings: number; years: ThinYear[]; inputHash: string }

/**
 * Thin mode (legacy TIME.thin, spec §16.2): one forward pass over the months, no row objects (the net flow goes to the cash-flow kernel) — what Monte Carlo
 * calls once per draw. Same kernel (`econ`) as the full engine, so its totals equal the deterministic headline.
 */
export function thinAggregate(K: K, annualRate?: number | null): ThinResult {
  const N = K.horizonMonths, nY = K.horizonYears, net = new Float64Array(N);
  const ySav = new Float64Array(nY), yRun = new Float64Array(nY), yTeam = new Float64Array(nY), yTok = new Float64Array(nY);
  for (let t = 1; t <= N; t++) {
    const e = econ(t, K);
    net[t - 1] = e.netSav;
    const y = Math.min(nY - 1, Math.floor((t - 1) / 12));
    ySav[y] = (ySav[y] as number) + e.grossSav; yRun[y] = (yRun[y] as number) + e.totalRun;
    yTeam[y] = (yTeam[y] as number) + e.teamCost; yTok[y] = (yTok[y] as number) + e.tokenCost;
  }
  const cf = cashflowSummary(net, { annualRate });
  const years: ThinYear[] = [];
  for (let y = 0; y < nY; y++) years.push({ savings: ySav[y] as number, totalRunCost: yRun[y] as number, teamCost: yTeam[y] as number, tokenCost: yTok[y] as number });
  return { npv: cf.npv, payback: cf.paybackMonth, roi: roiCanonical(cf.total, K.setupTotal), totalSavings: cf.total, years, inputHash: K.inputHash };
}

/** Thin aggregate of a case on the live curve; `model` must be a RAW model (never the curve overlay). */
export function thinFor(c: Ctx, opts: { curveModelId: string; model?: ModelResult; mode?: string }, annualRate?: number | null): ThinResult {
  return thinAggregate(buildK(c, opts.model ?? modelRaw(c), { mode: opts.mode ?? 'full', curveModelId: opts.curveModelId }), annualRate);
}
