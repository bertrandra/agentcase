/** @calc-zone presentation */
/**
 * Dark display mode (docs/THEME.md §6). The semantic roles, the chart palette and the translucent steps are a dedicated set chosen for dark
 * backgrounds; the raw scale steps that components still read (`primary-60` tints, `neutral-700` text…) are re-ranked by an OKLab lightness
 * curve so a light tint becomes a dark tint of the same hue and a dark text colour a light one: a pair that read in light reads in dark.
 */
import { curve, remapLightness, rgbaOf } from './color';
import { ALPHAS, SCALES } from './scales';

/** Light-mode lightness -> dark-mode lightness. White (the card surface) lands on L .235, the page tints just above it, text steps at L .78-.91. */
export const DARK_L = curve([[0, 0.98], [0.3, 0.91], [0.4, 0.855], [0.5, 0.785], [0.6, 0.715], [0.7, 0.61], [0.8, 0.44], [0.85, 0.37], [0.9, 0.31], [0.95, 0.27], [0.98, 0.25], [1, 0.235]]);
/** Light text colours on dark surfaces are softened a little (saturated light colours glare). */
const darkChroma = (L: number): number => (L > 0.7 ? 0.82 : 1);

type Scales = typeof SCALES;
/** Every scale step of `scales` re-ranked for a dark background (T4: a custom theme's scales go through the same curve). */
export function darkScales(scales: { [F in keyof Scales]: Record<string, string> } = SCALES): Record<string, string> {
  return Object.fromEntries(Object.entries(scales).flatMap(([family, steps]) => Object.entries(steps).map(([step, hex]) => [`${family}-${step}`, remapLightness(hex, DARK_L, darkChroma)])));
}

const A = (name: keyof typeof ALPHAS): number => Number(/-a(\d+)$/.exec(name)![1]) / 100;
/** The translucent steps on a dark page: tints use the dark base step, shadows stay black (and deeper), the white overlays of the header stay white. */
export function darkAlphas(scales: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of Object.keys(ALPHAS) as (keyof typeof ALPHAS)[]) {
    const base = n.replace(/-a\d+$/, '');
    out[n] = rgbaOf(scales[base] ?? '#000', A(n));
  }
  return Object.assign(out, {
    'neutral-0-a12': 'rgba(255,255,255,.12)', 'neutral-0-a25': 'rgba(255,255,255,.25)', 'neutral-0-a30': 'rgba(255,255,255,.3)', 'neutral-0-a45': 'rgba(255,255,255,.45)',
    'neutral-0-a80': 'rgba(16,20,26,.85)', 'neutral-80-a30': 'rgba(255,255,255,.06)', 'neutral-975-a30': 'rgba(230,232,236,.38)', 'neutral-1000-a5': 'rgba(255,255,255,.08)',
    'primary-975-a8': 'rgba(0,0,0,.35)', 'primary-975-a22': 'rgba(0,0,0,.45)', 'primary-975-a25': 'rgba(0,0,0,.5)', 'primary-965-a28': 'rgba(0,0,0,.55)',
    'info-375-a30': 'rgba(125,180,255,.45)',
  });
}

/** Semantic roles in dark mode: a dedicated set (surfaces lighten with elevation, text is off-white, business colours are lifted for dark grounds). */
export const DARK_ROLES = {
  bg: '#0f131a', surface: '#171c24', 'surface-raised': '#1e242e', 'surface-muted': '#1a1f28', 'surface-tint': '#1a2436',
  'text-on-data': '#ffffff', ink: '#e6e8ec', muted: '#a9b1bd', 'text-strong': '#f3f4f6', 'text-soft': '#c5cad2', 'text-label': '#b4bac4', 'text-link': '#8cbcff', 'text-heading': '#8cbcff',
  line: '#2e3542', 'line-strong': '#3b4352', 'line-subtle': '#272d38', 'line-tint': '#2c3f60',
  focus: '#8cbcff', hover: '#222d40', 'hover-text': '#a6ccff', selected: '#2f6fc0', 'selected-text': '#ffffff',
  'header-start': '#163a6b', 'header-end': '#0b0f19', 'header-text': '#f3f4f6',
  'kpibar-start': '#163a6b', 'kpibar-end': '#10294b', 'kpibar-text': '#f3f4f6',
  'sidebar-bg': '#151a22', 'sidebar-text': '#e6e8ec', 'sidebar-item-text': '#c5cad2', 'sidebar-group-bg': '#1d2431', 'sidebar-group-text': '#c9dcff', 'sidebar-group-hover-bg': '#26324a',
  'table-head-bg': '#1c3a66', 'table-head-text': '#f3f4f6', 'table-head-note': '#b9cdee', 'table-head-line': '#3b4352', 'table-line': '#2e3542', 'table-stripe': '#1a1f28', 'table-hover': '#222d40',
  automation: '#4fc6cc', 'glass-ceiling': '#f08f94', 'human-supervision': '#f5a865', agentic: '#b9a8ec', ai: '#62c6f2', vfte: '#63d391',
} as const;

/** Charts in dark mode: series lifted for a dark plot area, white gridlines at low alpha, the axis text of `muted`. Sequential / diverging ramps follow the dark scales. */
export const DARK_CHART = {
  'chart-cat-1': '#6ea8fe', 'chart-cat-2': '#3fc1c9', 'chart-cat-3': '#f39c4a', 'chart-cat-4': '#a993e6', 'chart-cat-5': '#4cc3f0', 'chart-cat-6': '#d9b74a',
  'chart-cat-7': '#ec7fa9', 'chart-cat-8': '#8cc96b', 'chart-grid': 'rgba(255,255,255,.08)', 'chart-axis': '#a9b1bd',
} as const;
