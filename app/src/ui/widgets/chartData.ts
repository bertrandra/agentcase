import type { ChartConfiguration } from 'chart.js';

const MAX_POINTS = 60, MAX_SERIES = 8;
const num = (v: unknown): string => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : v == null ? '' : String(v));
/** A data point is a number, or an {x, y} / [lo, hi] pair (scatter, floating bars). */
function cell(v: unknown): string {
  if (Array.isArray(v)) return v.map(num).join(' to ');
  if (v && typeof v === 'object') { const o = v as { x?: unknown; y?: unknown }; return `${num(o.x)}, ${num(o.y)}`; }
  return num(v);
}

/** The data behind a Chart.js config as one text line per series ("Series: category value; …"), the text alternative of the canvas. */
export function chartText(config: ChartConfiguration): string[] {
  const labels = (config.data?.labels ?? []) as unknown[];
  return (config.data?.datasets ?? []).slice(0, MAX_SERIES).flatMap((d, s) => {
    const all = d.data as unknown[], pts = all.slice(0, MAX_POINTS);
    if (!pts.length) return [];
    const name = typeof d.label === 'string' && d.label ? d.label : `Series ${s + 1}`;
    return [`${name}: ${pts.map((p, i) => (labels[i] == null ? cell(p) : `${num(labels[i])} ${cell(p)}`)).join('; ')}${all.length > MAX_POINTS ? '; …' : ''}`];
  });
}
