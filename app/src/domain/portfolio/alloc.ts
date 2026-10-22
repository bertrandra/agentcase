/** @calc-zone product-resolution */
/**
 * Apportion `total` (euro per month) over `weights` in whole cents with the largest-remainder method: the shares add up to the
 * rounded total to the cent, exactly. One recipient gets `total` itself; equal split when every weight is zero.
 */
export function allocateCents(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  if (n === 1) return [total];
  const cents = Math.round(total * 100), w = weights.map((x) => (x > 0 && Number.isFinite(x) ? x : 0));
  const sum = w.reduce((a, b) => a + b, 0), exact = w.map((x) => (sum > 0 ? (cents * x) / sum : cents / n));
  const base = exact.map(Math.floor);
  let left = cents - base.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, r: e - (base[i] as number) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let j = 0; left > 0; j = (j + 1) % n, left--) base[(order[j] as { i: number }).i]!++;
  return base.map((c) => c / 100);
}

/** Entry headcount of a team (rows with a non-numeric ETP count 0). */
export const teamEtp = (rows: { etp: number }[]): number => rows.reduce((a, r) => a + (+r.etp || 0), 0);
