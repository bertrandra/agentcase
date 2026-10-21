import type { ScenarioResult } from './scenarios';

/** Cumulative net cash-flow at month `mo`, linear within each year (setup paid up front). */
export function cumAt(m: Pick<ScenarioResult, 'setup' | 'yearSav'>, mo: number): number {
  let cum = -m.setup;
  for (let y = 0; y < m.yearSav.length; y++) {
    const start = y * 12;
    if (mo <= start) break;
    cum += (m.yearSav[y] as number) * Math.min(1, (mo - start) / 12);
  }
  return cum;
}

/** Chart axis: every 6 months over the horizon, starting at 0. */
export const monthAxis = (horizon: number): number[] => Array.from({ length: Math.floor((horizon * 12) / 6) + 1 }, (_, i) => i * 6);

export const fmtE = (v: number): string => `€${Math.round(v).toLocaleString('en-US')}`;
/** Savings / cash-flow with the legacy negative-in-parentheses convention. */
export const fmtSigned = (v: number): string => (v >= 0 ? fmtE(v) : `(${fmtE(-v)})`);
export const fmtPayback = (mo: number | null, hMonths: number): string => (mo == null || !isFinite(mo) ? `>${hMonths} mo` : mo <= 0 ? 'immediate' : `${mo} mo`);
export const roiText = (m: Pick<ScenarioResult, 'setup' | 'roi' | 'totBen'>): string =>
  m.setup > 0 ? `${Math.round(m.roi * 100)}%` : m.totBen > 0 ? '∞ (no setup)' : 'n/a';
