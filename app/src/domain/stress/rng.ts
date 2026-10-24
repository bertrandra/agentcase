/** @calc-zone stress */
import type { McParam } from './mcParams';

/** Deterministic RNG (mulberry32, the one seeded PRNG of the domain) — reproducible runs for auditability. */
export { mulberry32 as mcRng } from '../model/numerics';

/** Triangular-ish sample around the current value (mean-preserving), clamped to the parameter's valid range. */
export function mcSample(rng: () => number, base: number, p: McParam, scale: number, techCap: number): number {
  return mcSampleT(rng() + rng() - 1, base, p, scale, techCap);
}

/** The same sample from an already drawn triangular shock `t` in [-1, 1] (the law of the sum of two uniforms minus one). */
export function mcSampleT(t: number, base: number, p: McParam, scale: number, techCap: number): number {
  const half = (p.mode === 'pct' ? (Math.abs(base) * p.spread) / 100 : p.spread) * scale;
  const v = base + t * half;
  const hi = p.id === 'autoPotential' ? techCap : p.max;
  return Math.max(p.min, Math.min(hi, v));
}
