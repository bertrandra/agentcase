/** @calc-zone rate-card-team */
export const FTE_STEP = 0.5;
export const snapFTE = (v: unknown): number => { const n = parseFloat(String(v)); return isNaN(n) || n < 0 ? 0 : Math.round(n / FTE_STEP) * FTE_STEP; };

/** Largest-remainder apportionment: every share is a multiple of FTE_STEP and the shares sum to `total` exactly. */
export function apportionFTE(weights: number[], total: number): number[] {
  const n = weights.length;
  if (!n) return [];
  const units = Math.round((+total || 0) / FTE_STEP);
  if (units <= 0) return weights.map(() => 0);
  const w = weights.map((x) => Math.max(0, +x || 0)), W = w.reduce((s, x) => s + x, 0);
  const exact = W > 0 ? w.map((x) => (units * x) / W) : w.map(() => units / n);
  const base = exact.map(Math.floor);
  const rem = units - base.reduce((s, x) => s + x, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < rem; k++) base[order[k % n]!.i]!++;
  return base.map((u) => u * FTE_STEP);
}
