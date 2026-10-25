/** @calc-zone presentation */
/**
 * Contrast levels (docs/THEME.md §6), each a delta over the light or the dark value set:
 * - enhanced: text steps pushed away from the page (AAA, body text >= 7:1), visible lines (>= 3:1), a thicker, stronger focus ring;
 * - high: black and white like the Windows high-contrast themes (text >= 15:1), lines in the text colour, a 3px focus ring.
 * The scale steps go through a lightness function, the semantic roles are set explicitly.
 */
import { hexToRgb, remapLightness } from './color';

type Table = Record<string, string>;
const same = (a: string, b: string): boolean => String(hexToRgb(a)) === String(hexToRgb(b));
/** The steps whose colour `f` changes (the others are left out of the delta). */
const mapSteps = (scales: Table, f: (L: number) => number, chroma?: (L: number) => number): Table =>
  Object.fromEntries(Object.entries(scales).map(([n, hex]) => [n, remapLightness(hex, f, chroma)] as const).filter(([n, v]) => !same(v, scales[n]!)));

const ENHANCED_LIGHT = {
  ink: '#1a1a1a', muted: '#404040', 'text-strong': '#000000', 'text-soft': '#2e2e2e', 'text-label': '#3a3a3a', 'chart-axis': '#404040',
  line: '#8c8c8c', 'line-strong': '#6e6e6e', 'line-subtle': '#949494', 'line-tint': '#6f8fc4', 'table-line': '#8c8c8c', 'table-head-line': '#6e6e6e',
  'sidebar-item-text': '#2e2e2e', focus: '#003d7a', 'focus-header': '#ffffff', 'focus-width': '3px', 'shadow-focus': '0 0 0 3px rgba(0,61,122,.45)',
};
const ENHANCED_DARK = {
  bg: '#0a0d12', surface: '#10141a', 'surface-raised': '#161b23', 'surface-muted': '#13171e', 'table-stripe': '#13171e', 'sidebar-bg': '#0e1218',
  ink: '#f5f6f8', muted: '#d2d7de', 'text-strong': '#ffffff', 'text-soft': '#dde1e6', 'text-label': '#d2d7de', 'text-link': '#b4d4ff',
  'text-heading': '#b4d4ff',
  'sidebar-item-text': '#dde1e6', 'sidebar-group-text': '#dbe8ff', 'table-head-note': '#dce8fa', 'hover-text': '#c8e0ff', 'chart-axis': '#d2d7de',
  line: '#6b7483', 'line-strong': '#838c9b', 'line-subtle': '#5f6876', 'line-tint': '#5a77a6', 'table-line': '#6b7483', 'table-head-line': '#838c9b',
  automation: '#86e0e4', 'glass-ceiling': '#ffb8bc', 'human-supervision': '#ffc690', agentic: '#d3c7f7', ai: '#9ddcf8', vfte: '#97e6b6',
  selected: '#1d4f91', focus: '#b4d4ff', 'focus-width': '3px', 'shadow-focus': '0 0 0 3px rgba(180,212,255,.55)',
};
const HIGH_LIGHT = {
  bg: '#ffffff', surface: '#ffffff', 'surface-raised': '#ffffff', 'surface-muted': '#ffffff', 'surface-tint': '#ffffff',
  ink: '#000000', muted: '#000000', 'text-strong': '#000000', 'text-soft': '#000000', 'text-label': '#000000', 'text-inverse': '#ffffff',
  'text-link': '#00008f', 'text-heading': '#000000',
  line: '#000000', 'line-strong': '#000000', 'line-subtle': '#000000', 'line-tint': '#000000',
  focus: '#000000', 'focus-header': '#ffffff', hover: '#e0e0e0', 'hover-text': '#000000', selected: '#000000', 'selected-text': '#ffffff',
  'header-start': '#000000', 'header-end': '#000000', 'header-text': '#ffffff', 'kpibar-start': '#000000', 'kpibar-end': '#000000', 'kpibar-text': '#ffffff',
  'sidebar-bg': '#ffffff', 'sidebar-text': '#000000', 'sidebar-item-text': '#000000', 'sidebar-group-bg': '#ffffff', 'sidebar-group-text': '#000000',
  'sidebar-group-hover-bg': '#e0e0e0',
  'table-head-bg': '#000000', 'table-head-text': '#ffffff', 'table-head-note': '#ffffff', 'table-head-line': '#ffffff', 'table-line': '#000000',
  'table-stripe': '#ffffff', 'table-hover': '#ebebeb',
  automation: '#004d55', 'glass-ceiling': '#6e1a1f', 'human-supervision': '#7a2e00', agentic: '#3f2d78', ai: '#004a70', vfte: '#14532d',
  'chart-div-neg-strong': '#ffd9cc', 'chart-div-neg': '#ffebe5', 'chart-div-mid': '#fffbd6', 'chart-div-pos': '#e3f7ec',
  'chart-grid': 'rgba(0,0,0,.35)', 'chart-axis': '#000000', 'focus-width': '3px', 'shadow-focus': '0 0 0 3px #000000',
  'shadow-sm': '0 0 0 1px #000000', 'shadow-md': '0 0 0 1px #000000', 'shadow-lg': '0 0 0 1px #000000', 'shadow-xl': 'none',
};
const HIGH_DARK = {
  bg: '#000000', surface: '#000000', 'surface-raised': '#000000', 'surface-muted': '#000000', 'surface-tint': '#000000',
  ink: '#ffffff', muted: '#ffffff', 'text-strong': '#ffffff', 'text-soft': '#ffffff', 'text-label': '#ffffff', 'text-inverse': '#000000',
  'text-link': '#ffff00', 'text-heading': '#ffffff',
  line: '#ffffff', 'line-strong': '#ffffff', 'line-subtle': '#ffffff', 'line-tint': '#ffffff',
  focus: '#ffff00', 'focus-header': '#ffff00', hover: '#1f1f1f', 'hover-text': '#ffffff', selected: '#ffff00', 'selected-text': '#000000',
  'header-start': '#000000', 'header-end': '#000000', 'header-text': '#ffffff', 'kpibar-start': '#000000', 'kpibar-end': '#000000', 'kpibar-text': '#ffffff',
  'sidebar-bg': '#000000', 'sidebar-text': '#ffffff', 'sidebar-item-text': '#ffffff', 'sidebar-group-bg': '#000000', 'sidebar-group-text': '#ffffff',
  'sidebar-group-hover-bg': '#1f1f1f',
  'table-head-bg': '#000000', 'table-head-text': '#ffffff', 'table-head-note': '#ffffff', 'table-head-line': '#ffffff', 'table-line': '#ffffff',
  'table-stripe': '#000000', 'table-hover': '#1f1f1f',
  automation: '#7ff0f5', 'glass-ceiling': '#ffb3b8', 'human-supervision': '#ffc98f', agentic: '#d9ccff', ai: '#9fe0ff', vfte: '#9ff0bd',
  'chart-div-neg-strong': '#3a0d00', 'chart-div-neg': '#260a00', 'chart-div-mid': '#1f1c00', 'chart-div-pos': '#00210f',
  'chart-grid': 'rgba(255,255,255,.35)', 'chart-axis': '#ffffff', 'focus-width': '3px', 'shadow-focus': '0 0 0 3px #ffff00',
  'shadow-sm': '0 0 0 1px #ffffff', 'shadow-md': '0 0 0 1px #ffffff', 'shadow-lg': '0 0 0 1px #ffffff', 'shadow-xl': 'none',
};

/**
 * The delta of a contrast level over a mode, given that mode's scale steps (`scales`: every `<family>-<step>` resolved to a hex).
 * Light enhanced darkens the text steps (L < .72) by a fifth; dark enhanced lifts the light steps halfway to white.
 * High maps every step to the page or the ink: light tints to white, the rest to a near-black of the same hue (and the reverse in dark).
 */
export function contrastDelta(dark: boolean, level: 'enhanced' | 'high', scales: Table): Table {
  if (level === 'enhanced') {
    const steps = dark ? mapSteps(scales, (L) => (L > 0.6 ? L + (1 - L) * 0.5 : L)) : mapSteps(scales, (L) => (L < 0.72 ? L * 0.8 : L));
    return { ...steps, ...(dark ? ENHANCED_DARK : ENHANCED_LIGHT) };
  }
  const steps = dark ? mapSteps(scales, (L) => (L < 0.5 ? 0 : 0.97), (L) => (L > 0.5 ? 0.3 : 0)) : mapSteps(scales, (L) => (L >= 0.8 ? 1 : 0.22),
    (L) => (L > 0.5 ? 0 : 0.8));
  return { ...steps, ...(dark ? HIGH_DARK : HIGH_LIGHT) };
}

/** Strong categorical series for the high-contrast levels (graphics >= 3:1 on the page, mutually distinct). */
export const HIGH_CHART = {
  light: ['#0047a0', '#00665c', '#a33a00', '#5b3fa0', '#005f8a', '#6b5000', '#a0154f', '#2f6b12'],
  dark: ['#8fc1ff', '#5fe0d0', '#ffb36b', '#c9b5ff', '#7fd6ff', '#f0d060', '#ff9ec7', '#a8e07f'],
} as const;
/** Colour-blind safe categorical series (Okabe & Ito 2008 order), per mode; the high levels use the deeper / lighter variants. */
export const CVD_CHART = {
  light: ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#e69f00', '#56b4e9', '#000000', '#999999'],
  dark: ['#56b4e9', '#e69f00', '#2fc39a', '#f07a3a', '#e09cc4', '#f0e442', '#ffffff', '#7fa7d9'],
  'high-light': ['#005a8c', '#a84800', '#006e50', '#9c4a7a', '#8a5f00', '#2a6f9e', '#000000', '#5a5a5a'],
  'high-dark': ['#7fd0ff', '#ffb000', '#3fe0b0', '#ff8f50', '#ffb0e0', '#f0e442', '#ffffff', '#b0c8ff'],
} as const;
