/** @calc-zone adoption-curve */
/** Coarse-to-fine least-squares fits of three sigmoid families to the year-end anchors (months 12/24/36). */
export interface Fit { floor: number; ceiling: number; anchors: number[]; residuals: number[]; fitErrorPct: number; fitQuality: string; [k: string]: unknown }
type Rate = (t: number, a: number, b: number) => number;
interface Best { a: number; b: number; e: number }
const MONTHS = [12, 24, 36];

const ceilOf = (anchors: number[], ceilingPct: number) => Math.max(ceilingPct || 100, Math.max(...anchors) + 1e-6);
const sseOf = (anchors: number[], r: Rate) => (a: number, b: number) =>
  anchors.reduce((s, an, i) => { const d = r(MONTHS[i] as number, a, b) - an; return s + d * d; }, 0);

/** One grid pass (outer loop on `a`, inner on `b`, strict improvement) starting from the current best. */
function pass(f: (a: number, b: number) => number, cur: Best, r: [number, number, number, number, number], mins: [number, number]): Best {
  const [aLo, aHi, bLo, bHi, steps] = r;
  let bb: Best = { a: cur.a, b: cur.b, e: f(cur.a, cur.b) };
  const aS = (aHi - aLo) / steps, bS = (bHi - bLo) / steps;
  for (let i = 0; i <= steps; i++) {
    const a = aLo + i * aS; if (a <= mins[0]) continue;
    for (let j = 0; j <= steps; j++) { const b = bLo + j * bS; if (b <= mins[1]) continue; const e = f(a, b); if (e < bb.e) bb = { a, b, e }; }
  }
  return bb;
}

function build(anchors: number[], L: number, at: (t: number) => number, params: Record<string, number>, kind?: string): Fit {
  const residuals = anchors.map((a, i) => +(at(MONTHS[i] as number) - a).toFixed(4));
  const maxAbs = Math.max(...residuals.map(Math.abs));
  return { ...(kind ? { kind } : {}), floor: 0, ceiling: L, ...params, anchors: anchors.slice(), residuals, fitErrorPct: +maxAbs.toFixed(4),
    fitQuality: maxAbs < 0.5 ? 'good' : maxAbs < 3 ? 'approximate' : 'poor' };
}

export function fitLogistic(anchors: number[], ceilingPct: number): Fit {
  const L = ceilOf(anchors, ceilingPct), r: Rate = (t, k, t0) => L / (1 + Math.exp(-k * (t - t0))), f = sseOf(anchors, r);
  const m: [number, number] = [0, -Infinity];
  let b = pass(f, { a: 0.1, b: 22, e: f(0.1, 22) }, [0.02, 0.6, 0, 48, 48], m);
  b = pass(f, b, [Math.max(0.005, b.a - 0.05), b.a + 0.05, b.b - 4, b.b + 4, 40], m);
  b = pass(f, b, [Math.max(0.003, b.a - 0.01), b.a + 0.01, b.b - 1, b.b + 1, 40], m);
  return build(anchors, L, (t) => r(t, b.a, b.b), { k: +b.a.toFixed(6), t0: +b.b.toFixed(4) });
}

export function fitGompertz(anchors: number[], ceilingPct: number): Fit {
  const L = ceilOf(anchors, ceilingPct), r: Rate = (t, b, c) => L * Math.exp(-b * Math.exp(-c * t)), f = sseOf(anchors, r);
  const m: [number, number] = [0, 0];
  let b = pass(f, { a: 3, b: 0.08, e: f(3, 0.08) }, [0.2, 10, 0.01, 0.4, 50], m);
  b = pass(f, b, [Math.max(0.05, b.a - 1), b.a + 1, Math.max(0.005, b.b - 0.05), b.b + 0.05, 40], m);
  b = pass(f, b, [Math.max(0.02, b.a - 0.2), b.a + 0.2, Math.max(0.003, b.b - 0.01), b.b + 0.01, 40], m);
  return build(anchors, L, (t) => r(t, b.a, b.b), { b: +b.a.toFixed(6), c: +b.b.toFixed(6) }, 'gompertz');
}

export function fitBass(anchors: number[], ceilingPct: number): Fit {
  const L = ceilOf(anchors, ceilingPct);
  const r: Rate = (t, p, q) => { const s = p + q, e = Math.exp(-s * t); return L * Math.max(0, Math.min(1, (1 - e) / (1 + (q / p) * e))); };
  const f = sseOf(anchors, r), m: [number, number] = [1e-4, 0];
  let b = pass(f, { a: 0.03, b: 0.38, e: f(0.03, 0.38) }, [0.002, 0.12, 0.05, 0.9, 50], m);
  b = pass(f, b, [Math.max(0.001, b.a - 0.01), b.a + 0.01, Math.max(0.02, b.b - 0.1), b.b + 0.1, 40], m);
  b = pass(f, b, [Math.max(0.0005, b.a - 0.002), b.a + 0.002, Math.max(0.01, b.b - 0.02), b.b + 0.02, 40], m);
  return build(anchors, L, (t) => r(t, b.a, b.b), { p: +b.a.toFixed(6), q: +b.b.toFixed(6) }, 'bass');
}

const cache = new Map<string, Fit>();
/** Fits are a pure function of (family, anchors, ceiling) — cached, bounded (legacy cache kept 256 entries). */
export function fitCurveCached(family: string, anchors: number[], ceiling: number): Fit {
  const key = `${family}|${anchors.join(',')}|${ceiling}`;
  const hit = cache.get(key); if (hit) return hit;
  const fit = family === 'logistic' ? fitLogistic(anchors, ceiling) : family === 'gompertz' ? fitGompertz(anchors, ceiling)
    : family === 'bass' ? fitBass(anchors, ceiling) : null;
  if (!fit) throw new Error('TIME: no fitter for curve family ' + family);
  cache.set(key, fit);
  if (cache.size > 256) cache.delete(cache.keys().next().value as string);
  return fit;
}
