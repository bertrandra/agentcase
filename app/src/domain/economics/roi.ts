/** @calc-zone economics-headline */
/**
 * ROI / payback presentation rules shared by every economics view (legacy v18.9 M-2/M-3). The ROI rule itself is the cash-flow kernel's
 * `roiCanonical` (economics/cashflow.ts), re-exported here for the views. Pure, no formatting of money.
 */
export { roiCanonical } from './cashflow';

/** "123%" or "n/a" for a null ratio. */
export const fmtRoiPct = (r: number | null): string => (r == null ? 'n/a' : `${Math.round(r * 100)}%`);

/** "9 mo", "immediate" (month 0: nothing to recover) or ">36 mo" (never within the horizon). `horizonMonths` is the series length. */
export function fmtPayback(mo: number | null | undefined, horizonMonths: number): string {
  if (mo == null || !isFinite(mo)) return `>${horizonMonths} mo`;
  return mo <= 0 ? 'immediate' : `${mo} mo`;
}

/** Year label: 1 -> "Y1". */
export const yLabel = (y: number): string => `Y${y}`;

export type Verdict = 'go' | 'conditional' | 'reconsider';

/** Plain-language read of the deterministic case: ROI >= 150 % GO, >= 30 % conditional, otherwise reconsider (a null ROI reconsiders). */
export const roiVerdict = (roi: number | null): Verdict => (roi != null && roi >= 1.5 ? 'go' : roi != null && roi >= 0.3 ? 'conditional' : 'reconsider');
