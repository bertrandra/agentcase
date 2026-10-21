import type { CurvePoint } from '../types/state';
import type { Fit } from './fit';
import { splineEval } from './spline';

/** Constants the adoption curve needs (the relevant slice of the Time-Engine K). */
export interface CurveK {
  curveModelId: string; ramps: number[]; rampCapPct: number;
  logistic?: Fit; gompertz?: Fit; bass?: Fit; spline?: { points: CurvePoint[] };
}
export interface Adapter { id: string; family: string; evaluate(t: number, K: CurveK): number }

export const yearOf = (t: number, K: { ramps: number[] }): number => Math.min(K.ramps.length - 1, Math.floor((t - 1) / 12));
const need = (f: Fit | undefined, id: string): Fit => { if (!f) throw new Error(`TIME: ${id} requires a fitted curve`); return f; };
const num = (f: Fit, k: string) => f[k] as number;

export const ADAPTERS: Record<string, Adapter> = {
  'legacy.flatAnnual': { id: 'legacy.flatAnnual', family: 'legacyFlat', evaluate: (t, K) => K.ramps[yearOf(t, K)] as number },
  'legacy.linearAnchor': {
    id: 'legacy.linearAnchor', family: 'legacyFlat',
    evaluate(t, K) {
      const r = K.ramps as [number, number, number], yp = t / 12;
      if (yp < 1) return r[0] * yp;
      if (yp < 2) return r[0] + (r[1] - r[0]) * (yp - 1);
      if (yp < 3) return r[1] + (r[2] - r[1]) * (yp - 2);
      return r[r.length - 1] as number;
    },
  },
  'logistic.default': {
    id: 'logistic.default', family: 'logistic',
    evaluate(t, K) { const P = need(K.logistic, 'logistic.default'); return P.floor + (P.ceiling - P.floor) / (1 + Math.exp(-num(P, 'k') * (t - num(P, 't0')))); },
  },
  'gompertz.default': {
    id: 'gompertz.default', family: 'gompertz',
    evaluate(t, K) { const P = need(K.gompertz, 'gompertz.default'); return P.floor + (P.ceiling - P.floor) * Math.exp(-num(P, 'b') * Math.exp(-num(P, 'c') * t)); },
  },
  'bass.default': {
    id: 'bass.default', family: 'bass',
    evaluate(t, K) {
      const P = need(K.bass, 'bass.default'), p = num(P, 'p'), q = num(P, 'q'), e = Math.exp(-(p + q) * t);
      return P.floor + (P.ceiling - P.floor) * Math.max(0, Math.min(1, (1 - e) / (1 + (q / p) * e)));
    },
  },
  'spline.default': { id: 'spline.default', family: 'spline', evaluate: (t, K) => splineEval(t, K.spline?.points ?? []) },
};

/** Adoption level at month t, clamped by the engagement-context cap (legacy curves are already capped upstream). */
export function rampAt(t: number, K: CurveK): number {
  const adapter = ADAPTERS[K.curveModelId];
  if (!adapter) throw new Error('TIME: unknown curveModelId ' + K.curveModelId);
  const raw = adapter.evaluate(t, K);
  if (K.curveModelId.startsWith('legacy')) return raw;
  return Math.min(K.rampCapPct, Math.max(0, raw));
}
