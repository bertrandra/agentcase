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

/** A token's role: the name of the colour meaning a domain read-out chooses (a status band, a scenario hue); the UI resolves it in the theme in effect. */
export type ColourRole = TokenName;

/** `{name}` references replaced by their values, recursively, in `table` (a theme's base or base + display table). */
export function resolveTokens(value: string, table: Readonly<ThemeValues>, depth = 0): string {
  if (depth > 8) throw new Error(`theme: reference loop in "${value}"`);
  return value.replace(/\{([a-z0-9-]+)\}/g, (_, n: string) => {
    const v = table[n as TokenName];
    if (v === undefined) throw new Error(`theme: unknown token {${n}}`);
    return resolveTokens(v, table, depth + 1);
  });
}
/** The resolved value of a token in `table` (pure: the caller says which theme; docs/THEME.md §2). */
export const tokIn = (table: Readonly<ThemeValues>, name: TokenName): string => resolveTokens(table[name], table);

/** `#rgb` / `#rrggbb` (a literal hex, or a token name resolved in `table`, default: the default theme) as an `rgba(r,g,b,a)` string. */
export function alpha(color: TokenName | string, a: number | string, table: Readonly<ThemeValues> = THEME_DEFAULT): string {
  const hex = color.startsWith('#') ? color : tokIn(table, color as TokenName);
  const h = hex.slice(1).length === 3 ? hex.slice(1).replace(/./g, (c) => c + c) : hex.slice(1, 7);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
/** Excel ARGB (`FFRRGGBB`) of a solid colour token in `print`, the base theme of the export (a workbook is printed: never dark). */
export function argb(print: Readonly<ThemeValues>, name: TokenName): string {
  const hex = tokIn(print, name).slice(1);
  return 'FF' + (hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex).toUpperCase();
}

/** The `:root` declarations of a theme: one custom property per token, references as `var()`. tokens.css holds the default one verbatim. */
export function themeCss(table: Readonly<ThemeValues> = THEME_DEFAULT): string {
  return Object.entries(table).map(([n, v]) => `  --ac-${n}: ${v.replace(/\{([a-z0-9-]+)\}/g, 'var(--ac-$1)')};`).join('\n');
}
