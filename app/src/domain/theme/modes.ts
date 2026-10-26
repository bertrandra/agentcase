/** @calc-zone presentation */
/**
 * Display modes (docs/THEME.md §6): light / dark, three contrast levels, colour-blind safe charts and reduced motion, as value sets over a base
 * theme. The same sets reach the CSS (generated blocks keyed by `data-ac-*` attributes on :root, `modesCss()`) and the TS readers
 * (`resolveAppTheme()` in resolve.ts, read by `tok()` of the resulting theme). The exports (Excel, report) keep the base theme: they are
 * printed, so always light.
 */
import { contrastDelta, CVD_CHART, HIGH_CHART } from './contrast';
import { DARK_CHART, DARK_ROLES, darkAlphas, darkScales } from './dark';
import { resolveTokens, THEME_DEFAULT, type ThemeValues, type TokenName } from './index';
import { SCALES } from './scales';

export type DisplayMode = 'light' | 'dark';
export type ContrastLevel = 'standard' | 'enhanced' | 'high';
/** A resolved display: what the user picked, with "auto" already resolved against the system (ui/display). */
export interface DisplaySpec { mode: DisplayMode; contrast: ContrastLevel; cvd: boolean; reduceMotion: boolean }
export const DISPLAY_DEFAULT: Readonly<DisplaySpec> = Object.freeze({ mode: 'light', contrast: 'standard', cvd: false, reduceMotion: false });

type Table = Record<string, string>;
const SCALE_NAMES = Object.entries(SCALES).flatMap(([f, steps]) => Object.keys(steps).map((s) => `${f}-${s}`));
const scalesOf = (t: Readonly<Table>): Table => Object.fromEntries(SCALE_NAMES.map((n) => [n, resolveTokens(t[n]!, t as ThemeValues)]));
const CAT = Array.from({ length: 8 }, (_, i) => `chart-cat-${i + 1}`), SEQ_DIV = Object.keys(THEME_DEFAULT).filter((n) => /^chart-(seq|div)-/.test(n));

/** The dark value set over `base`: its scale steps re-ranked, the dedicated roles, charts and translucent steps. */
export function darkValues(base: Readonly<ThemeValues> = THEME_DEFAULT): Table {
  const steps = darkScales(groupScales(scalesOf(base)));
  return { ...steps, ...darkAlphas(steps), ...DARK_ROLES, ...DARK_CHART };
}
function groupScales(flat: Table): { [F in keyof typeof SCALES]: Record<string, string> } {
  const out: Record<string, Record<string, string>> = {};
  for (const [n, v] of Object.entries(flat)) { const i = n.lastIndexOf('-'); (out[n.slice(0, i)] ??= {})[n.slice(i + 1)] = v; }
  return out as { [F in keyof typeof SCALES]: Record<string, string> };
}

/**
 * The delta of a contrast level over a mode (for high: the charts keep the standard sequential ramp, take paler / deeper diverging cells and the
 * strong series).
 */
export function contrastValues(dark: boolean, level: 'enhanced' | 'high', base: Readonly<ThemeValues> = THEME_DEFAULT): Table {
  const standard = { ...base, ...(dark ? darkValues(base) : {}) } as ThemeValues;
  const delta = contrastDelta(dark, level, scalesOf(standard));
  if (level === 'enhanced') return delta;
  const charts = Object.fromEntries([...SEQ_DIV.filter((n) => !(n in delta)).map((n) => [n, resolveTokens(standard[n as TokenName], standard)]),
    ...CAT.map((n, i) => [n, HIGH_CHART[dark ? 'dark' : 'light'][i]!])]);
  return { ...delta, ...charts };
}
/** The colour-blind safe categorical series of a mode / level. */
export function cvdValues(dark: boolean, high: boolean): Table {
  const pal = CVD_CHART[high ? (dark ? 'high-dark' : 'high-light') : dark ? 'dark' : 'light'];
  return Object.fromEntries(CAT.map((n, i) => [n, pal[i]!]));
}
export const MOTION_OFF: Readonly<Table> = { 'duration-fast': '0s', 'duration-base': '0s' };

/** Every override of a display over `base` (empty for the default display: light, standard, no option). */
export function displayTheme(spec: DisplaySpec, base: Readonly<ThemeValues> = THEME_DEFAULT): Partial<ThemeValues> {
  const dark = spec.mode === 'dark';
  return {
    ...(dark ? darkValues(base) : {}), ...(spec.contrast === 'standard' ? {} : contrastValues(dark, spec.contrast, base)),
    ...(spec.cvd ? cvdValues(dark, spec.contrast === 'high') : {}), ...(spec.reduceMotion ? MOTION_OFF : {}),
  } as Partial<ThemeValues>;
}

const block = (selector: string, table: Readonly<Table>, extra = ''): string =>
  `${selector} {\n${extra}${Object.entries(table).map(([n, v]) => `  --ac-${n}: ${v.replace(/\{([a-z0-9-]+)\}/g, 'var(--ac-$1)')};`).join('\n')}\n}`;
const LIGHT = ':root:not([data-ac-mode="dark"])', DARK = ':root[data-ac-mode="dark"]';
/** The CSS of every display (tokens.css, generated after the default block): later blocks win at equal specificity. */
export function modesCss(): string {
  return [
    block(DARK, darkValues(), '  color-scheme: dark;\n'),
    block(`${LIGHT}[data-ac-contrast="enhanced"]`, contrastValues(false, 'enhanced')),
    block(`${DARK}[data-ac-contrast="enhanced"]`, contrastValues(true, 'enhanced')),
    block(`${LIGHT}[data-ac-contrast="high"]`, contrastValues(false, 'high')), block(`${DARK}[data-ac-contrast="high"]`, contrastValues(true, 'high')),
    block(`${LIGHT}[data-ac-cvd="on"]`, cvdValues(false, false)), block(`${DARK}[data-ac-cvd="on"]`, cvdValues(true, false)),
    block(`${LIGHT}[data-ac-contrast="high"][data-ac-cvd="on"]`, cvdValues(false, true)),
    block(`${DARK}[data-ac-contrast="high"][data-ac-cvd="on"]`, cvdValues(true, true)),
    block(':root[data-ac-motion="reduce"]', MOTION_OFF),
  ].join('\n');
}
