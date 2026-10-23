import { tok } from '@/domain/theme';
/** SVG geometry of the adoption-curve editor (legacy renderScurveMaturity): month 1..N on x, adoption 0..100 % on y. */
export const W = 920, H = 340;
export const M = { l: 52, r: 16, t: 24, b: 34 };
const iw = W - M.l - M.r, ih = H - M.t - M.b;

export interface Geo { N: number; sx(month: number): number; sy(pct: number): number; invX(px: number): number; invY(py: number): number }
export const geoOf = (N: number): Geo => ({
  N,
  sx: (mo) => M.l + (N <= 1 ? 0 : ((mo - 1) / (N - 1)) * iw),
  sy: (v) => M.t + (1 - v / 100) * ih,
  invX: (px) => (N <= 1 ? 1 : 1 + ((px - M.l) / iw) * (N - 1)),
  invY: (py) => (1 - (py - M.t) / ih) * 100,
});

export const LEVEL_COLOR: Record<string, string> = { get L1() { return tok('slate-700'); }, get L2() { return tok('chart-cat-5'); }, get L3() { return tok('chart-cat-2'); }, get L4() { return tok('chart-cat-1'); } };
/** Fixed adoption bands drawn behind the curve. */
export const BANDS: [number, number, string][] = [[0, 25, 'L1'], [25, 55, 'L2'], [55, 80, 'L3'], [80, 100, 'L4']];
export const GRID = [0, 25, 55, 80, 100];

/** "M1 M13 M25 … M{N}" axis months (a label every 12 months, the last one right-aligned). */
export const axisMonths = (N: number): number[] => { const l: number[] = []; for (let m = 1; m <= N; m += 12) l.push(m); return l; };

export const pathOf = (g: Geo, f: (t: number) => number): string => {
  let d = '';
  for (let t = 1; t <= g.N; t++) d += `${t > 1 ? 'L' : 'M'}${g.sx(t).toFixed(1)} ${g.sy(f(t)).toFixed(1)}`;
  return d;
};
