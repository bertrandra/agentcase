/** @calc-zone stress */
import { mulberry32, stdNormal } from '../model/numerics';
import type { McShock } from '../stress';

/** The correlation as the engine reads it: a number in [0, 1], 0 when absent or not finite. */
export const clampRho = (rho: number | undefined): number => (rho !== undefined && Number.isFinite(rho) ? Math.max(0, Math.min(1, rho)) : 0);

/** djb2 of an id, as an unsigned 32-bit integer (stable across runs and machines). */
export function idHash(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return h >>> 0;
}

/**
 * The stream seed of one product: `seed XOR hash(productId)`. With a single planned product the seed is used as is, so a one-product
 * portfolio draws exactly what the single-case Monte Carlo draws for the same seed.
 */
export const productSeed = (seed: number, id: string, planned: number): number => (planned <= 1 ? seed : (seed ^ idHash(id)) >>> 0);

/**
 * The common shocks: one standard normal per (draw, driver), shared by every product. Drawn from a stream of its own (the seed mixed
 * with a constant), so products' own streams are never consumed by it. Null when rho = 0.
 */
export function commonShock(seed: number, rho: number, draws: number, drivers: number): McShock | null {
  if (!(rho > 0) || drivers === 0) return null;
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0), zs = new Float64Array(draws * drivers);
  for (let i = 0; i < zs.length; i++) zs[i] = stdNormal(rng);
  return { rho, z: (draw, k) => zs[draw * drivers + k] as number };
}
