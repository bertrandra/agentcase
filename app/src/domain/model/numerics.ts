/** @calc-zone foundation */
import { bisect } from './lce';

/** Seeded PRNG (legacy mcRng / mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  if (q <= 0) return sorted[0] as number;
  if (q >= 1) return sorted[sorted.length - 1] as number;
  const pos = (sorted.length - 1) * q, base = Math.floor(pos), rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? (sorted[base] as number) + rest * (next - (sorted[base] as number)) : (sorted[base] as number);
}

/** Moment-match Beta(a,b) to a mean and an ~80 % interval [lo,hi]. */
export function betaFromMeanCI(mean: number, lo: number, hi: number): { a: number; b: number } {
  mean = Math.min(1 - 1e-6, Math.max(1e-6, mean));
  const sd = Math.max(1e-6, (hi - lo) / 2.563103);
  const v = Math.min(sd * sd, mean * (1 - mean) - 1e-9);
  const t = (mean * (1 - mean)) / v - 1;
  return { a: Math.max(1e-3, mean * t), b: Math.max(1e-3, (1 - mean) * t) };
}

const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function logGamma(x: number): number {
  const g = 7;
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = LG[0] as number;
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += (LG[i] as number) / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(x: number, a: number, b: number): number {
  const MAXIT = 200, EPS = 3e-9, FPMIN = 1e-300, qab = a + b, qap = a + 1, qam = a - 1;
  const fix = (v: number) => (Math.abs(v) < FPMIN ? FPMIN : v);
  let c = 1, d = 1 / fix(1 - (qab * x) / qap), h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 / fix(1 + aa * d); c = fix(1 + aa / c); h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 / fix(1 + aa * d); c = fix(1 + aa / c);
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularised incomplete beta I_x(a,b) = Beta CDF. */
export function betai(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(x, a, b)) / a : 1 - (bt * betacf(1 - x, b, a)) / b;
}
export const betaInv = (u: number, a: number, b: number): number => bisect((x) => betai(x, a, b) - u, 1e-9, 1 - 1e-9, 1e-7, 100);

export function triInv(u: number, min: number, mode: number, max: number): number {
  if (max <= min) return min;
  const c = (mode - min) / (max - min);
  return u < c ? min + Math.sqrt(u * (max - min) * (mode - min)) : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

/** Box-Muller standard normal from a uniform generator. */
export function stdNormal(rng: () => number): number {
  let u1 = rng(); const u2 = rng();
  if (u1 < 1e-12) u1 = 1e-12;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Abramowitz-Stegun 7.1.26 normal CDF (max error ~1.5e-7). */
export function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1, ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}
