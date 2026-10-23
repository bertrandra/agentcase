/** @calc-zone presentation */
/**
 * The theme token table: the single source of every visual value (docs/THEME.md). tokens.css carries the same table as CSS custom properties
 * (`--ac-<name>`, checked by tests/ui/theme-tokens.test.ts); code that cannot use `var()` (chart.js canvases, colour arithmetic, the Excel and
 * HTML exports) reads the values here with `tok()`.
 */
import { ALPHAS, SCALES } from './scales';
import { CHART, EXPORT, ROLES } from './semantic';
import { DENSITY, MOTION, SHAPE, TYPE } from './shape';
import { LAYOUT } from './layout';

type Scales = typeof SCALES;
type ScaleToken = { [F in keyof Scales]: `${F}-${keyof Scales[F] & number}` }[keyof Scales];
export type TokenName = ScaleToken | keyof typeof ALPHAS | keyof typeof ROLES | keyof typeof CHART | keyof typeof EXPORT
  | keyof typeof TYPE | keyof typeof SHAPE | keyof typeof DENSITY | keyof typeof MOTION | keyof typeof LAYOUT;
export type ThemeValues = Record<TokenName, string>;

const scaleEntries = Object.entries(SCALES).flatMap(([family, steps]) => Object.entries(steps).map(([step, hex]) => [`${family}-${step}`, hex] as const));
/** The default theme: the legacy v18.13 look, value for value. Values may refer to other tokens as `{name}`. */
export const THEME_DEFAULT: Readonly<ThemeValues> = Object.freeze({
  ...Object.fromEntries(scaleEntries), ...ALPHAS, ...ROLES, ...CHART, ...EXPORT, ...TYPE, ...SHAPE, ...DENSITY, ...MOTION, ...LAYOUT,
} as ThemeValues);
export const TOKEN_NAMES = Object.keys(THEME_DEFAULT) as TokenName[];

let base: Readonly<ThemeValues> = THEME_DEFAULT, display: Partial<ThemeValues> = {}, active: Readonly<ThemeValues> = THEME_DEFAULT;
/** Switch the base theme (the case's theme, T4 presets); the display overrides of the viewer stay on top. The CSS side is the same values as custom properties. */
export function setActiveTheme(values: Partial<ThemeValues>): void { base = Object.freeze({ ...THEME_DEFAULT, ...values }); active = Object.freeze({ ...base, ...display }); }
/** Switch the display overrides (dark mode, contrast level, colour-blind palette, reduced motion: domain/theme/modes `displayTheme()`). */
export function setDisplayTheme(values: Partial<ThemeValues>): void { display = values; active = Object.freeze({ ...base, ...display }); }
/** The base theme in effect (without the viewer's display overrides). */
export const baseTheme = (): Readonly<ThemeValues> => base;

/** `{name}` references replaced by their values, recursively. */
export function resolveTokens(value: string, table: Readonly<ThemeValues> = active, depth = 0): string {
  if (depth > 8) throw new Error(`theme: reference loop in "${value}"`);
  return value.replace(/\{([a-z0-9-]+)\}/g, (_, n: string) => {
    const v = table[n as TokenName];
    if (v === undefined) throw new Error(`theme: unknown token {${n}}`);
    return resolveTokens(v, table, depth + 1);
  });
}
/** The resolved value of a token in the active theme (default: the legacy look). */
export const tok = (name: TokenName): string => resolveTokens(active[name], active);
/** The resolved value of a token in the base theme, ignoring the display mode: the printed exports (Excel, HTML report) stay light. */
export const printTok = (name: TokenName): string => resolveTokens(base[name], base);

/** Token names whose items resolve against the active theme when read, so a module-level palette follows a theme switch. */
export function themedList(names: readonly TokenName[]): readonly string[] {
  return new Proxy(names as unknown as string[], { get: (t, k, r) => (typeof k === 'string' && /^\d+$/.test(k) && Number(k) < names.length ? tok(names[Number(k)]!) : Reflect.get(t, k, r)) });
}

/** `#rgb` / `#rrggbb` (a token name or a literal hex) as an `rgba(r,g,b,a)` string. */
export function alpha(color: TokenName | string, a: number | string): string {
  const hex = color.startsWith('#') ? color : tok(color as TokenName);
  const h = hex.slice(1).length === 3 ? hex.slice(1).replace(/./g, (c) => c + c) : hex.slice(1, 7);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
/** Excel ARGB (`FFRRGGBB`) of a solid colour token, in the base theme (a workbook is printed: never dark). */
export function argb(name: TokenName): string {
  const hex = printTok(name).slice(1);
  return 'FF' + (hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex).toUpperCase();
}

/** The `:root` declarations of a theme: one custom property per token, references as `var()`. tokens.css holds the default one verbatim. */
export function themeCss(table: Readonly<ThemeValues> = THEME_DEFAULT): string {
  return Object.entries(table).map(([n, v]) => `  --ac-${n}: ${v.replace(/\{([a-z0-9-]+)\}/g, 'var(--ac-$1)')};`).join('\n');
}
