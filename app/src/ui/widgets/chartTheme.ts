import { Chart, type ChartConfiguration } from 'chart.js';
import { tok } from '@/domain/theme';
import type { DisplaySpec } from '@/domain/theme/modes';

/**
 * The display options applied to every chart.js canvas (docs/THEME.md §6.3-6.4): axis text and gridlines of the mode, no animation under
 * reduced motion and, with the colour-blind option, a second channel besides colour: line dash + point style per line series, a hatch per bar series.
 */
const LEGACY = { color: Chart.defaults.color, borderColor: Chart.defaults.borderColor };
/** chart.js global text and line colours: the legacy defaults in the default look (pixel-identical), the mode's axis / grid tokens otherwise. */
export function applyChartDefaults(spec: DisplaySpec): void {
  const plain = spec.mode === 'light' && spec.contrast === 'standard';
  Chart.defaults.color = plain ? LEGACY.color : tok('chart-axis');
  Chart.defaults.borderColor = plain ? LEGACY.borderColor : tok('chart-grid');
}

const DASHES: number[][] = [[], [6, 3], [2, 2], [10, 3, 2, 3], [4, 4], [12, 4], [1, 3], [8, 2, 2, 2, 2, 2]];
const POINTS = ['circle', 'rect', 'triangle', 'rectRot', 'star', 'crossRot', 'rectRounded', 'cross'] as const;
type Hatch = (g: CanvasRenderingContext2D, s: number) => void;
const line = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void => { g.moveTo(x0, y0); g.lineTo(x1, y1); };
const HATCHES: (Hatch | null)[] = [
  null, (g, s) => { line(g, 0, s, s, 0); line(g, -1, 1, 1, -1); line(g, s - 1, s + 1, s + 1, s - 1); }, (g, s) => { line(g, 0, 0, s, s); line(g, -1, s - 1, 1, s + 1); line(g, s - 1, -1, s + 1, 1); },
  (g, s) => line(g, 0, s / 2, s, s / 2), (g, s) => line(g, s / 2, 0, s / 2, s), (g, s) => { line(g, 0, s / 2, s, s / 2); line(g, s / 2, 0, s / 2, s); },
  (g, s) => { g.moveTo(s / 2 + 1.5, s / 2); g.arc(s / 2, s / 2, 1.5, 0, Math.PI * 2); }, (g, s) => { line(g, 0, s, s, 0); line(g, 0, 0, s, s); },
];
/** A colour with the hatch of series `i` drawn over it (null where the canvas has no 2D context, e.g. jsdom: the plain colour stays). */
function hatch(color: string, i: number): CanvasPattern | null {
  const draw = HATCHES[i % HATCHES.length];
  if (!draw || typeof document === 'undefined') return null;
  try {
    const c = document.createElement('canvas'), s = 8; c.width = c.height = s;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = color; g.fillRect(0, 0, s, s);
    g.strokeStyle = tok('surface'); g.fillStyle = tok('surface'); g.lineWidth = 1.5; g.beginPath(); draw(g, s); g.stroke(); if (i % HATCHES.length === 6) g.fill();
    return g.createPattern(c, 'repeat');
  } catch { return null; }
}

type Ds = Record<string, unknown>;
const typeOf = (config: ChartConfiguration, d: Ds): string => (typeof d.type === 'string' ? d.type : config.type);
/** The config with the display options applied (a new object; the caller's config is not touched). */
export function themedConfig(config: ChartConfiguration, spec: DisplaySpec): ChartConfiguration {
  if (!spec.cvd && !spec.reduceMotion) return config;
  const datasets = (config.data?.datasets ?? []).map((raw, i) => {
    const d = { ...(raw as unknown as Ds) };
    if (!spec.cvd) return d;
    const t = typeOf(config, d);
    if (t === 'line' || t === 'radar') {
      d.borderDash = DASHES[i % DASHES.length]; d.pointStyle = POINTS[i % POINTS.length];
      if (!d.pointRadius) d.pointRadius = 2.5;
    } else if (t === 'bar') {
      const bg = d.backgroundColor;
      if (typeof bg === 'string') d.backgroundColor = hatch(bg, i) ?? bg;
      else if (Array.isArray(bg)) d.backgroundColor = bg.map((c: unknown, k) => (typeof c === 'string' ? hatch(c, k) ?? c : c));
    }
    return d;
  });
  const options = { ...(config.options ?? {}), ...(spec.reduceMotion ? { animation: false as const } : {}) };
  return { ...config, data: { ...config.data, datasets }, options } as unknown as ChartConfiguration;
}
