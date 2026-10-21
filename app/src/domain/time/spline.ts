import type { CurvePoint } from '../types/state';
import type { Ctx } from '../ctx';
import { engagementCoef, hriRampFactor } from '../engagement';

/** Monotone cubic (Fritsch–Carlson PCHIP) through the control points plus an implicit (0,0) origin; flat before/after. */
export function splineEval(t: number, userPts: CurvePoint[] | null | undefined): number {
  const P: CurvePoint[] = [{ t: 0, a: 0 }];
  [...(userPts ?? [])].sort((a, b) => a.t - b.t).forEach((p) => {
    if (isFinite(p.t) && isFinite(p.a) && p.t > (P[P.length - 1] as CurvePoint).t) P.push({ t: p.t, a: p.a });
  });
  const n = P.length, pt = (i: number) => P[i] as CurvePoint;
  if (n < 2) return n ? pt(n - 1).a : 0;
  if (t <= pt(0).t) return pt(0).a;
  if (t >= pt(n - 1).t) return pt(n - 1).a;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((pt(i + 1).a - pt(i).a) / (pt(i + 1).t - pt(i).t));
  const m = new Array<number>(n);
  m[0] = d[0] as number; m[n - 1] = d[n - 2] as number;
  for (let i = 1; i < n - 1; i++) { const a = d[i - 1] as number, b = d[i] as number; m[i] = a * b <= 0 ? 0 : (a + b) / 2; }
  for (let i = 0; i < n - 1; i++) {
    const di = d[i] as number;
    if (di === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a1 = (m[i] as number) / di, b1 = (m[i + 1] as number) / di, s = a1 * a1 + b1 * b1;
    if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a1 * di; m[i + 1] = tau * b1 * di; }
  }
  let k = 0;
  for (let i = 0; i < n - 1; i++) { if (t >= pt(i).t && t <= pt(i + 1).t) { k = i; break; } }
  const h = pt(k + 1).t - pt(k).t, u = (t - pt(k).t) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * pt(k).a + (u3 - 2 * u2 + u) * h * (m[k] as number) + (-2 * u3 + 3 * u2) * pt(k + 1).a + (u3 - u2) * h * (m[k + 1] as number);
}

/** Control points the spline adapter reads: the drawn adoption scaled like the ramp anchors (cap, speed, readiness drag). */
export function enginePts(c: Ctx): CurvePoint[] {
  const cv = engagementCoef(c);
  const k = (cv.rampSpeed || 1) * hriRampFactor(c), cap = cv.rampCapPct != null ? cv.rampCapPct : 100;
  const drawn = c.s.scurve?.pts;
  const pts = Array.isArray(drawn) && drawn.length >= 2
    ? drawn.map((p) => ({ t: p.t, a: p.a }))
    : [{ t: 12, a: c.inp.p('y1Ramp') }, { t: 24, a: c.inp.p('y2Ramp') }, { t: 36, a: c.inp.p('y3Ramp') }];
  return pts.map((p) => ({ t: p.t, a: Math.min(cap, p.a * k) }));
}
