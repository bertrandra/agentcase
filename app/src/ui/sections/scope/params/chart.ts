/** Geometry and right-edge tags of the "Automation over time" chart (legacy renderAutomationCurve). */
export const W = 920, H = 340;
export const M = { l: 52, r: 120, t: 22, b: 34 };
export const COL = { real: '#006e79', gap: '#0a6e9c', ceil: '#b04600', manual: '#566074', pot: '#0058AB', human: '#71609E', manln: '#5a6785', vfte: '#2E9E5B' };
const iw = W - M.l - M.r, ih = H - M.t - M.b;

export const geoOf = (N: number) => ({
  sx: (mo: number) => M.l + (N <= 1 ? 0 : ((mo - 1) / (N - 1)) * iw),
  sy: (v: number) => M.t + (1 - v / 100) * ih,
});
export type Geo = ReturnType<typeof geoOf>;

export const linePath = (g: Geo, N: number, f: (t: number) => number): string => {
  let d = '';
  for (let t = 1; t <= N; t++) d += `${t > 1 ? 'L' : 'M'}${g.sx(t).toFixed(1)} ${g.sy(f(t)).toFixed(1)}`;
  return d;
};

export interface Tag { y: number; y0: number; col: string; txt: string }
/** Value tags at the right edge, pushed apart vertically so they never overprint (a thin leader joins a moved tag to its line). */
export function layoutTags(raw: { y: number; col: string; txt: string }[]): Tag[] {
  const tags = raw.map((t) => ({ ...t, y0: t.y })).sort((a, b) => a.y - b.y), gap = 13;
  let prev = -1e9;
  tags.forEach((t) => { if (t.y < prev + gap) t.y = prev + gap; prev = t.y; });
  const over = (tags[tags.length - 1] as Tag).y - (M.t + ih);
  if (over > 0) tags.forEach((t) => { t.y -= over; });
  return tags;
}
