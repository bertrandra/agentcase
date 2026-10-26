/** @calc-zone stress */
/** Number of bins of the net-benefit distribution. */
export const HIST_BINS = 20;
/** Strong correlation of a parameter with the net outcome (|r| above it is highlighted in the sensitivity table). */
export const STRONG_CORRELATION = 0.4;

export interface HistBin { center: number; count: number; negative: boolean }

/**
 * Equal-width bins of sorted draws (the single-product and the portfolio Monte Carlo): each bin's centre, count and whether it lies entirely below
 * zero. One bin width of 1 when every draw is equal.
 */
export function histogramBins(sorted: number[], bins = HIST_BINS): HistBin[] {
  const n = sorted.length, lo = sorted[0] ?? 0, hi = sorted[n - 1] ?? 0, w = (hi - lo) / bins || 1, counts = new Array<number>(bins).fill(0);
  sorted.forEach((v) => { const i = Math.min(bins - 1, Math.floor((v - lo) / w)); counts[i] = (counts[i] as number) + 1; });
  return counts.map((count, i) => ({ center: lo + (i + 0.5) * w, count, negative: lo + (i + 1) * w < 0 }));
}
