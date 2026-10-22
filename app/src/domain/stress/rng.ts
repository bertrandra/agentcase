/** @calc-zone stress */
import type { McParam } from './mcParams';

/** Deterministic RNG (mulberry32) — reproducible runs for auditability. */
export function mcRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
