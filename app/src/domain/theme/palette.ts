/** @calc-zone presentation */
/**
 * The one-colour palette generator (docs/THEME.md §8.9): from a seed colour, a contrast level (0 soft … 50 balanced … 100 strong) and a harmony,
 * every colour a theme can set — the nine scale anchors, surfaces, header / KPI bar, navigation, tables, text, focus, the business colours and
 * the 8 chart series. Pure and deterministic. The brand colour is the seed itself (darkened, hue and chroma kept, only when white text would not
 * read on it); the semantic families keep their meaning (green success, amber warning, red danger, teal automation) and only lean toward the seed.
 * Guard: the result is checked against the contrast pairs of every display (light / dark × standard / enhanced / high, the themed display
 * derivation); a palette that misses one is regenerated a notch stronger until it passes.
 */
import { contrastRatio, fromOklch } from './color';
import { failures } from './contrastPairs';
import { familyFrom, themeBase } from './derive';
import type { GeneratorSettings, Harmony } from './generatorSettings';
import type { ThemeValues } from './index';
import type { ContrastLevel, DisplayMode } from './modes';
import { accents, by, chartSeries, fitDark, seedOf, semantic, type Seed } from './paletteParts';
import { themedDisplay } from './themedDisplay';
import { normHex, type ColourKey } from './themeDef';

export type Palette = Record<ColourKey, string>;
const WHITE = '#ffffff', PRIMARY_MIN = 5;

/** The palette at slider position `t` (0..1), before the guard. */
export function build(s: Seed, seed: string, t: number, harmony: Harmony): Palette {
  const tint = s.grey ? 0 : Math.min(1, s.C / 0.08), h = s.h, Cb = Math.min(0.2, s.C), on = (L: number, C: number) => fromOklch(L, C * tint, h);
  const bg = on(by(t, 0.955, 0.972, 0.966), by(t, 0.018, 0.008, 0.005)), surface = on(by(t, 0.992, 1, 1), by(t, 0.006, 0, 0));
  const page = [bg, surface, WHITE], chrome = (L: number, C: number) => fitDark(L, C, h, [WHITE], 4.6);
  const greyC = Math.min(0.012, s.C * 0.12), ink = fromOklch(by(t, 0.33, 0.29, 0.18), greyC, h);
  const groupBg = on(by(t, 0.95, 0.955, 0.915), by(t, 0.018, 0.012, 0.03)), [secondary, info] = accents(s, t, harmony, page);
  const teal = semantic('teal', s, t, page), warning = semantic('warning', s, t, page), danger = semantic('danger', s, t, page);
  const cat = chartSeries(s, t, harmony, page), primary = contrastRatio(seed, WHITE) >= PRIMARY_MIN ? seed : fitDark(s.L, s.C, h, [WHITE], PRIMARY_MIN);
  return {
    primary,
    secondary, info, teal, success: semantic('success', s, t, page), warning, danger,
    neutral: fromOklch(by(t, 0.36, 0.32, 0.22), greyC, h),
    slate: fitDark(by(t, 0.54, 0.49, 0.42), s.grey ? 0.004 : Math.min(0.045, 0.012 + s.C * 0.15), h, page, 4.6),
    bg, surface, 'surface-raised': on(by(t, 0.996, 1, 1), by(t, 0.004, 0, 0)), 'line-strong': on(by(t, 0.9, 0.885, 0.7), 0.01),
    'header-start': chrome(by(t, 0.56, 0.46, 0.34), Cb * by(t, 0.75, 1, 1.1)), 'header-end': chrome(by(t, 0.4, 0.24, 0.16), Cb * by(t, 0.5, 0.45, 0.55)),
    'header-text': WHITE, 'kpibar-start': chrome(by(t, 0.54, 0.46, 0.36), Cb * by(t, 0.75, 1, 1.1)), 'kpibar-end': chrome(by(t, 0.47, 0.4, 0.28), Cb * by(t, 0.7, 0.85, 1)),
    'kpibar-text': WHITE, 'sidebar-bg': on(by(t, 0.977, 0.99, 1), by(t, 0.012, 0.004, 0)), 'sidebar-text': ink, 'sidebar-group-bg': groupBg,
    'sidebar-group-text': fitDark(by(t, 0.28, 0.23, 0.18), Math.min(0.09, s.C), h, [groupBg], 7), selected: chrome(by(t, 0.5, 0.46, 0.36), Cb),
    'table-head-bg': fitDark(by(t, 0.46, 0.44, 0.34), Cb, h, [WHITE, familyFrom('primary', primary)['primary-200'] ?? WHITE], 5.2),   /* its note: primary-200 */
    'table-head-text': WHITE, 'table-stripe': on(by(t, 0.975, 0.98, 0.955), by(t, 0.012, 0.006, 0.012)),
    ink, 'text-heading': fitDark(by(t, 0.52, 0.46, 0.36), Cb * by(t, 0.8, 1, 1.1), h, page, 4.6),
    'text-link': fitDark(by(t, 0.5, 0.45, 0.38), Cb * by(t, 0.9, 1, 1.15), h, page, 4.6), focus: fitDark(by(t, 0.56, 0.5, 0.42), Math.max(Cb, 0.1), h, page, 3.2),
    automation: teal, 'glass-ceiling': danger, 'human-supervision': warning,
    ...(Object.fromEntries(cat.map((c, i) => [`chart-cat-${i + 1}`, c])) as Record<`chart-cat-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`, string>),
  };
}

const DISPLAYS: readonly (readonly [DisplayMode, ContrastLevel])[] = [['light', 'standard'], ['light', 'enhanced'], ['light', 'high'], ['dark', 'standard'], ['dark', 'enhanced'], ['dark', 'high']];
/** The table of a theme with these colours in a display (base + themed display). */
export function paletteTable(colours: Partial<Palette>, mode: DisplayMode, contrast: ContrastLevel): ThemeValues {
  const def = { colours, axes: {} }, base = themeBase(def);
  return { ...base, ...themedDisplay({ mode, contrast, cvd: false, reduceMotion: false }, def, base) } as ThemeValues;
}
/** Every contrast pair a palette misses, over the six displays (empty: it passes). */
export const paletteFailures = (p: Partial<Palette>): string[] => DISPLAYS.flatMap(([m, c]) => failures(paletteTable(p, m, c), c, `${m}/${c}`).map((f) => `${m}/${c}: ${f}`));

/** The palette of a seed colour. `contrast` 0..100 (clamped); `harmony` defaults to analogous. A seed that is not a hex colour reads as the default blue. */
export function paletteFromSeed(seed: string, opts: Pick<GeneratorSettings, 'contrast'> & { harmony?: Harmony }): Palette {
  const hex = normHex(seed) ?? '#0058ab', s = seedOf(hex), harmony = opts.harmony ?? 'analogous', t0 = Math.max(0, Math.min(100, Number(opts.contrast) || 0)) / 100;
  let p = build(s, hex, t0, harmony);
  for (let t = t0 + 0.1; paletteFailures(p).length && t < 1.1; t += 0.1) p = build(s, hex, Math.min(1, t), harmony);
  return p;
}
