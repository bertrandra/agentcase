/** @calc-zone foundation */
/**
 * The one "adds up to 100 %" rule of every split (TO-BE location split, strategy geo split, target location mix, knowledge-domain weights, the
 * Excel readers). Pure.
 */

/**
 * Tolerance in percentage points: a split is complete when its total is within 0.5 of 100. It is the legacy file's tolerance for the TO-BE split,
 * the strategy geo split and the token mix; its target location mix (and its Excel reader) used 1 point (DEV-SPLIT-TOLERANCE).
 */
export const SPLIT_TOLERANCE = 0.5;

/** Total of the shares (a missing or non-numeric share counts 0). */
export function splitTotal(shares: Iterable<number | string | null | undefined>): number {
  let t = 0;
  for (const v of shares) { const n = typeof v === 'number' ? v : parseFloat(v ?? ''); if (Number.isFinite(n)) t += n; }
  return t;
}

/** What is left to allocate (negative: too much), in percentage points. */
export const splitRemainder = (total: number): number => 100 - total;

/** True when the total adds up to 100 % within `SPLIT_TOLERANCE`. */
export const isSplitComplete = (total: number): boolean => Math.abs(total - 100) < SPLIT_TOLERANCE;
