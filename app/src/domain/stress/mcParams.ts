/** @calc-zone stress */
import type { Ctx } from '../ctx';
import { engagementCoef } from '../engagement';
import { khEnabled, khTargetCC } from '../knowledge';
import type { CaseState } from '../types/state';

export interface McParam { id: string; label: string; mode: 'abs' | 'pct'; spread: number; min: number; max: number }

/** Uncertain parameters and their default spreads (legacy MC_PARAMS_DEFAULT). `mode` abs = ± points, pct = ± % of the current value. */
export const MC_PARAMS_DEFAULT: McParam[] = [
  { id: 'autoPotential', label: 'Automation potential (pts)', mode: 'abs', spread: 10, min: 0, max: 80 },
  { id: 'y1Ramp', label: 'Year-1 ramp (pts)', mode: 'abs', spread: 10, min: 0, max: 100 },
  { id: 'y2Ramp', label: 'Year-2 ramp (pts)', mode: 'abs', spread: 10, min: 0, max: 100 },
  { id: 'y3Ramp', label: 'Year-3 ramp (pts)', mode: 'abs', spread: 10, min: 0, max: 100 },
  { id: 'glassCeiling', label: 'Glass ceiling (pts)', mode: 'abs', spread: 5, min: 0, max: 60 },
  { id: 'tokensPerArt', label: 'Tokens per artifact (%)', mode: 'pct', spread: 30, min: 0, max: 1e9 },
  { id: 'infra', label: 'Infra cost (%)', mode: 'pct', spread: 20, min: 0, max: 1e9 },
];

/** The case's parameters (state key `mcParams`), defaults when the case carries none. */
export const mcParamsOf = (s: CaseState): McParam[] => (s as unknown as { mcParams?: McParam[] }).mcParams ?? MC_PARAMS_DEFAULT;

/** Engagement context widens, a knowledge hub narrows, the ramp and potential spreads (EV-06 / EV-10). */
export function mcSpreadScale(c: Ctx, id: string): number {
  let f = 1;
  if (id === 'y1Ramp' || id === 'y2Ramp' || id === 'y3Ramp' || id === 'autoPotential') {
    f *= engagementCoef(c).mcWiden;
    if (khEnabled(c)) f *= 1 - 0.08 * khTargetCC(c);
  }
  return Math.max(0.2, f);
}
