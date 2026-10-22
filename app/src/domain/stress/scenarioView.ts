import type { ScenarioResult } from './scenarios';

/** Cumulative net cash-flow at month `mo`: the Time Engine's own cumulative series (setup spread as the engine spreads it), 0 at month 0. */
export const cumAt = (m: Pick<ScenarioResult, 'cum'>, mo: number): number => m.cum[Math.max(0, Math.min(mo, m.cum.length - 1))] as number;

/** Chart axis: every 6 months over the horizon, starting at 0. */
export const monthAxis = (horizon: number): number[] => Array.from({ length: Math.floor((horizon * 12) / 6) + 1 }, (_, i) => i * 6);

/** €1,234,567, negative "−€1,234" (DEV-NEG-MONEY); "n/a" for a figure the model cannot compute (the legacy printed €NaN, e.g. a 2-year horizon on the 3-year scenario arrays). */
export const fmtE = (v: number): string => (isNaN(v) ? 'n/a' : `${v < 0 && Math.round(v) !== 0 ? '−' : ''}€${Math.abs(Math.round(v)).toLocaleString('en-US')}`);
/** Savings / cash-flow: the same signed form (the legacy printed a negative in parentheses). */
export const fmtSigned = fmtE;
/** Payback month shown for a scenario: nothing to pay back when there is no setup and the lever saves money (immediate), else the engine's crossing. */
export const paybackShown = (m: Pick<ScenarioResult, 'setup' | 'totBen' | 'pbMonth'>): number | null => (m.setup <= 0 && m.totBen > 0 ? 0 : m.pbMonth);
export const fmtPayback = (mo: number | null, hMonths: number): string => (mo == null || !isFinite(mo) ? `>${hMonths} mo` : mo <= 0 ? 'immediate' : `${mo} mo`);
export const roiText = (m: Pick<ScenarioResult, 'setup' | 'roi' | 'totBen'>): string =>
  m.setup > 0 ? (m.roi == null ? 'n/a' : `${Math.round(m.roi * 100)}%`) : m.totBen > 0 ? '∞ (no setup)' : 'n/a';
