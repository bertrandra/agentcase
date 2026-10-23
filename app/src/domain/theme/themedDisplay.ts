/** @calc-zone presentation */
/**
 * The display modes of a library theme (docs/THEME.md §8.2). `displayTheme(spec, base)` already re-ranks the theme's own scales for dark and the
 * contrast levels; its dedicated role values (dark header, links, focus, surfaces…) were chosen for the default blue, so here they turn to the
 * theme's hue: brand-tinted roles by the primary anchor's hue shift, surfaces by the slate anchor's. A role the theme sets in light gets its dark
 * counterpart (chrome backgrounds deepened, series and business colours lifted). High contrast stays black and white for every theme.
 */
import { fromOklch, hexToRgb, toOklch } from './color';
import { themeBase } from './derive';
import type { ThemeValues } from './index';
import { displayTheme, type DisplaySpec } from './modes';
import { SCALES } from './scales';
import { SCALE_ANCHORS, normHex, type ScaleKey, type ThemeDef } from './themeDef';

type Table = Record<string, string>;
interface Shift { dh: number; c: number }
const oklch = (hex: string): [number, number, number] => toOklch(hexToRgb(hex) ?? [0, 0, 0]);

/** How far the theme's anchor of `family` turns the hue and scales the chroma of the default anchor (null: the family is not themed). */
function shiftOf(family: ScaleKey, anchor: string | undefined): Shift | null {
  const a = normHex(anchor), d = (SCALES[family] as Record<number, string>)[SCALE_ANCHORS[family]]!;
  if (!a || a === normHex(d)) return null;
  const [, Cd, hd] = oklch(d), [, C, h] = oklch(a);
  return { dh: h - hd, c: Cd < 0.02 ? 1 : Math.min(2.5, C / Cd) };
}
const turn = (hex: string, s: Shift): string => {
  if (!hexToRgb(hex)) return hex;
  const [L, C, h] = oklch(hex);
  return fromOklch(L, C * s.c, (h + s.dh + 360) % 360);
};
const withL = (hex: string, f: (L: number) => number, cf = 1): string => { const [L, C, h] = oklch(hex); return fromOklch(f(L), C * cf, h); };

const BRAND = ['surface-tint', 'text-link', 'text-heading', 'line-tint', 'focus', 'focus-header', 'hover', 'hover-text', 'selected', 'header-start', 'header-end', 'kpibar-start',
  'kpibar-end', 'sidebar-group-text', 'sidebar-group-hover-bg', 'table-head-bg', 'table-head-note', 'table-hover', 'chart-cat-1'];
const SURFACES = ['bg', 'surface', 'surface-raised', 'surface-muted', 'table-stripe', 'sidebar-bg', 'sidebar-group-bg', 'line', 'line-strong', 'line-subtle', 'table-line', 'table-head-line'];
const CHROME = ['header-start', 'header-end', 'kpibar-start', 'kpibar-end', 'table-head-bg', 'selected'];
const LIFT = ['automation', 'glass-ceiling', 'human-supervision', 'focus', 'text-link', 'text-heading'];
const CHART = Array.from({ length: 8 }, (_, i) => `chart-cat-${i + 1}`);

/** The display overrides of a theme (empty for the default display; `displayTheme()` unchanged for the default theme). */
export function themedDisplay(spec: DisplaySpec, def: Pick<ThemeDef, 'colours' | 'axes'>, base: Readonly<ThemeValues> = themeBase(def)): Partial<ThemeValues> {
  const d = { ...displayTheme(spec, base) } as Table, o = def.colours as Table, dark = spec.mode === 'dark';
  if (!Object.keys(o).length || spec.contrast === 'high' || (!dark && spec.contrast === 'standard')) return d as Partial<ThemeValues>;
  const brand = shiftOf('primary', o.primary), surf = shiftOf('slate', o.slate);
  if (brand) for (const k of BRAND) if (d[k] && !(spec.cvd && CHART.includes(k))) d[k] = turn(d[k]!, brand);
  if (surf) for (const k of SURFACES) if (d[k]) d[k] = turn(d[k]!, surf);
  if (!dark) {   // enhanced: a chrome background the theme sets darkens like the text steps (by a fifth), so its white text reaches 7:1
    for (const k of CHROME) if (normHex(o[k])) d[k] = withL(normHex(o[k])!, (L) => (L < 0.72 ? L * 0.8 : L));
    return d as Partial<ThemeValues>;
  }
  for (const k of CHROME) if (normHex(o[k])) d[k] = withL(normHex(o[k])!, (L) => Math.min(L, 0.4), 0.85);
  if (spec.contrast === 'standard') {
    for (const k of LIFT) if (normHex(o[k])) d[k] = withL(normHex(o[k])!, (L) => Math.max(L, 0.78), 0.85);
    if (!spec.cvd) for (const k of CHART) if (normHex(o[k])) d[k] = withL(normHex(o[k])!, (L) => Math.max(L, 0.72));
  }
  return d as Partial<ThemeValues>;
}
