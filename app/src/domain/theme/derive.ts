/** @calc-zone presentation */
/**
 * From a library theme to token values (docs/THEME.md §8). A scale anchor re-derives its whole family from the default steps: each step keeps its
 * rank (OKLab lightness mapped monotonically so the anchor step lands on the anchor's lightness), turns by the anchor's hue shift and scales its
 * chroma by the anchor's chroma ratio, so tints and shades stay coherent and the steps stay ordered by lightness. Roles are set as given.
 * The default theme has no override at all: `themeOverrides()` is empty and the base table is THEME_DEFAULT itself (pixel parity).
 */
import { axisTokens } from './axes';
import { fromOklch, hexToRgb, rgbaOf, toOklch } from './color';
import { THEME_DEFAULT, type ThemeValues } from './index';
import { ALPHAS, SCALES } from './scales';
import { isScaleKey, normHex, SCALE_ANCHORS, type ScaleKey, type ThemeDef } from './themeDef';

type Table = Record<string, string>;
const oklch = (hex: string): [number, number, number] => toOklch(hexToRgb(hex) ?? [0, 0, 0]);

/** The steps of `family` re-derived around `anchor` (empty when the anchor is the default one: the family keeps its legacy steps). */
export function familyFrom(family: ScaleKey, anchor: string): Table {
  const steps = SCALES[family] as Record<number, string>, at = SCALE_ANCHORS[family], a = normHex(anchor);
  if (!a || a === normHex(steps[at])) return {};
  const [LdA, CdA, hdA] = oklch(steps[at]!), [LA, CA, hA] = oklch(a), achromatic = CdA < 0.02;
  const mapL = (L: number): number => (L >= LdA ? LA + ((L - LdA) * (1 - LA)) / Math.max(1e-6, 1 - LdA) : (L * LA) / Math.max(1e-6, LdA));
  const out: Table = {};
  for (const [step, hex] of Object.entries(steps)) {
    if (Number(step) === at) { out[`${family}-${step}`] = a; continue; }
    const [L, C, h] = oklch(hex);
    out[`${family}-${step}`] = achromatic ? fromOklch(mapL(L), CA, hA) : fromOklch(mapL(L), Math.min(0.37, (C * CA) / CdA), (h + hA - hdA + 360) % 360);
  }
  return out;
}

/** The translucent steps whose base step changed, re-made on the new base (same alpha). */
function alphasOf(steps: Table): Table {
  const out: Table = {};
  for (const n of Object.keys(ALPHAS)) {
    const base = n.replace(/-a\d+$/, ''), v = steps[base];
    if (v) out[n] = rgbaOf(v, Number(/-a(\d+)$/.exec(n)![1]) / 100);
  }
  return out;
}

/** Every token a theme changes over the default look (colours only; the axes come from `axisTokens`). Empty for the default theme. */
export function themeOverrides(def: Pick<ThemeDef, 'colours'>): Partial<ThemeValues> {
  const steps: Table = {}, roles: Table = {};
  for (const [k, v] of Object.entries(def.colours)) {
    const hex = normHex(v);
    if (!hex) continue;
    if (isScaleKey(k)) Object.assign(steps, familyFrom(k, hex)); else roles[k] = hex;
  }
  if (!Object.keys(steps).length && !Object.keys(roles).length) return {};
  // A branded header: the header buttons' focus ring takes the header text colour (the legacy default kept the brand blue, 1:1 on its gradient).
  return { ...steps, ...alphasOf(steps), 'focus-header': '{header-text}', ...roles } as Partial<ThemeValues>;
}

/** The full base table of a theme: the default look, its colour overrides, its axis tokens. */
export function themeBase(def: Pick<ThemeDef, 'colours' | 'axes'>): Readonly<ThemeValues> {
  const o = themeOverrides(def), ax = axisTokens(def.axes);
  if (!Object.keys(o).length && !Object.keys(ax).length) return THEME_DEFAULT;
  return Object.freeze({ ...THEME_DEFAULT, ...o, ...ax } as ThemeValues);
}

