import type { CurvePoint } from '../types/state';
import { splineEval } from '../time/spline';

/** Pure part of the legacy S-curve editor (scEnsurePts, scFit, scEval, scAddPoint, scRemovePoint, scDragMove, scCommit sampling). */
export type CurveFn = (t: number) => number;
/** Slider bounds of the Y1/Y2/Y3 ramp anchors (the sampled curve is clamped to them, like legacy scSetRamp). */
export const RAMP_LIMITS: readonly (readonly [number, number])[] = [[5, 40], [20, 70], [40, 100]];
export const SAMPLE_MONTHS = [12, 24, 36] as const;
export const MAX_POINTS = 8;
export const MIN_POINTS = 3;

const bySort = (pts: CurvePoint[]): CurvePoint[] => pts.map((p) => ({ t: p.t, a: p.a })).sort((a, b) => a.t - b.t);

/** Three control points seeded from the ramp anchors, horizon-aware (legacy scInitPts). */
export function initPts(N: number, ramps: number[]): CurvePoint[] {
  const ys = [0, 1, 2].map((i) => { const v = ramps[i] as number; return isFinite(v) ? v : 0; });
  const ms = N >= 36 ? [12, 24, 36] : [Math.max(1, Math.round(N / 3)), Math.max(2, Math.round((2 * N) / 3)), N];
  if ((ms[1] as number) <= (ms[0] as number)) ms[1] = (ms[0] as number) + 1;
  if ((ms[2] as number) <= (ms[1] as number)) ms[2] = (ms[1] as number) + 1;
  return ms.map((t, i) => ({ t, a: ys[i] as number }));
}

/** Control points valid for horizon N: clamped, sorted, strictly increasing months (legacy scEnsurePts, H-4). */
export function ensurePts(pts: CurvePoint[] | null | undefined, N: number, ramps: number[]): CurvePoint[] {
  if (!Array.isArray(pts) || pts.length < MIN_POINTS) return initPts(N, ramps);
  const out = bySort(pts.map((p) => ({ t: Math.max(1, Math.min(N, p.t)), a: Math.max(0, Math.min(100, p.a)) })));
  const n = out.length;
  for (let i = 1; i < n; i++) if ((out[i] as CurvePoint).t <= (out[i - 1] as CurvePoint).t) (out[i] as CurvePoint).t = (out[i - 1] as CurvePoint).t + 1;
  if ((out[n - 1] as CurvePoint).t > N) {
    (out[n - 1] as CurvePoint).t = N;
    for (let i = n - 2; i >= 0; i--) if ((out[i] as CurvePoint).t >= (out[i + 1] as CurvePoint).t) (out[i] as CurvePoint).t = (out[i + 1] as CurvePoint).t - 1;
  }
  return (out[0] as CurvePoint).t < 1 ? initPts(N, ramps) : out;
}

/** Logistic / Gompertz fitted through the points: grid-search the ceiling C that best linearises the transformed values (legacy scFit). */
export function fitCurve(points: CurvePoint[], family: string): CurveFn {
  const pts = bySort(points), n = pts.length, gompertz = family === 'gompertz';
  let amax = 0;
  pts.forEach((p) => { if (p.a > amax) amax = p.a; });
  const zf = (a0: number, C: number) => { const a = Math.max(0.2, Math.min(C - 0.2, a0)); return gompertz ? Math.log(-Math.log(a / C)) : Math.log(C / a - 1); };
  const lin = (C: number) => {
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of pts) { const z = zf(p.a, C); if (!isFinite(z)) return null; sx += p.t; sy += z; sxx += p.t * p.t; sxy += p.t * z; }
    const det = n * sxx - sx * sx;
    if (Math.abs(det) < 1e-9) return null;
    const slope = (n * sxy - sx * sy) / det, ic = (sy - slope * sx) / n;
    let res = 0;
    for (const p of pts) res += Math.pow(zf(p.a, C) - (slope * p.t + ic), 2);
    return { slope, ic, res };
  };
  let bestC = Math.min(100, Math.max(amax + 1, amax / 0.85)), bestR = Infinity;
  for (let C = amax + 0.5; C <= 100.0001; C += 0.5) { const r = lin(C); if (r && r.res < bestR) { bestR = r.res; bestC = C; } }
  for (let C = Math.max(amax + 0.2, bestC - 0.5); C <= Math.min(100, bestC + 0.5); C += 0.05) { const r = lin(C); if (r && r.res < bestR) { bestR = r.res; bestC = C; } }
  const L = lin(bestC) ?? { slope: -0.15, ic: 2 };
  let k = -L.slope;
  if (!(k > 0.0005)) k = 0.01;
  const C3 = bestC;
  if (gompertz) { const b = Math.exp(L.ic); return (t) => C3 * Math.exp(-b * Math.exp(-k * t)); }
  const t0 = L.ic / k;
  return (t) => C3 / (1 + Math.exp(-k * (t - t0)));
}

/** The editor's adoption curve (0..100): PCHIP spline through the points, or the fitted family (legacy scEval). */
export function curveOf(family: string, pts: CurvePoint[]): CurveFn {
  let raw: CurveFn;
  if (family === 'spline') raw = (t) => splineEval(t, pts);
  else { try { raw = fitCurve(pts, family); } catch { raw = () => 0; } }
  return (t) => { const v = raw(t); return isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; };
}

/** Y1/Y2/Y3 anchors: the curve sampled at months 12/24/36, rounded and clamped to the slider bounds (legacy scCommit). */
export function sampleRamps(family: string, pts: CurvePoint[]): [number, number, number] {
  const f = curveOf(family, pts);
  return SAMPLE_MONTHS.map((m, i) => { const [lo, hi] = RAMP_LIMITS[i] as readonly [number, number]; return Math.round(Math.max(lo, Math.min(hi, f(m)))); }) as [number, number, number];
}

/** Insert a point in the middle of the widest gap, on the curve (legacy scAddPoint). Unchanged when already at the maximum. */
export function addPoint(points: CurvePoint[], family: string): CurvePoint[] {
  if (points.length >= MAX_POINTS) return points;
  const pts = bySort(points);
  let gi = 0, gmax = -1;
  for (let i = 0; i < pts.length - 1; i++) { const g = (pts[i + 1] as CurvePoint).t - (pts[i] as CurvePoint).t; if (g > gmax) { gmax = g; gi = i; } }
  const nt = Math.round(((pts[gi] as CurvePoint).t + (pts[gi + 1] as CurvePoint).t) / 2);
  pts.push({ t: nt, a: Math.round(curveOf(family, pts)(nt)) });
  return pts;
}

/** Remove the middle point (legacy scRemovePoint); never below three. */
export function removePoint(points: CurvePoint[]): CurvePoint[] {
  if (points.length <= MIN_POINTS) return points;
  const pts = bySort(points);
  pts.splice(Math.floor(pts.length / 2), 1);
  return pts;
}

/** Move point i, kept between its neighbours in month and adoption (legacy scDragMove). */
export function movePoint(points: CurvePoint[], i: number, t: number, a: number, N: number): CurvePoint[] {
  const n = points.length, prev = points[i - 1], next = points[i + 1];
  if (i < 0 || i >= n) return points;
  const loT = prev ? prev.t + 1 : 1, hiT = next ? next.t - 1 : N, loA = prev ? prev.a : 0, hiA = next ? next.a : 100;
  const nt = Math.max(loT, Math.min(hiT, Math.round(t))), na = Math.max(Math.max(0, loA), Math.min(Math.min(100, hiA), a));
  return points.map((p, j) => (j === i ? { t: nt, a: na } : { t: p.t, a: p.a }));
}

/** Curve id the Time Engine reads for an editor family (legacy scSetFamily). */
export const curveIdOf = (family: string): string => (family === 'spline' ? 'spline.default' : `${family}.default`);
