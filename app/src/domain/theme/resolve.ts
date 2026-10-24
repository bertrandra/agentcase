/** @calc-zone presentation */
/**
 * The pure theme resolver (docs/THEME.md §2, §8.2): a library theme under a viewer's display → the token tables and the readers code uses. No module
 * state: the theme in effect lives in the UI layer (a React context and the custom properties on `<html>`), the exports get their print theme from
 * the controller. `tok()` of a `Theme` reads base + display (the screen); `base` is the theme without the display (the printed exports, always light).
 */
import { themeBase } from './derive';
import { alpha, THEME_DEFAULT, tokIn, type ThemeValues, type TokenName } from './index';
import { DISPLAY_DEFAULT, type DisplaySpec } from './modes';
import { themedDisplay } from './themedDisplay';
import type { ThemeDef } from './themeDef';

export type Tok = (name: TokenName) => string;
export interface Theme {
  /** base + display: the values the screen paints */
  readonly values: Readonly<ThemeValues>;
  /** the base theme without the viewer's display: what the printed exports (Excel, HTML report) read */
  readonly base: Readonly<ThemeValues>;
  readonly spec: DisplaySpec;
  /** a token resolved in `values` */
  readonly tok: Tok;
  /** several tokens resolved in `values` (a series palette) */
  readonly list: (names: readonly TokenName[]) => string[];
  /** a token or a literal hex as `rgba()` in `values` */
  readonly alpha: (color: TokenName | string, a: number | string) => string;
}

/** A `Theme` over `base` with the display overrides `display` on top (resolved values are cached per theme object). */
export function makeTheme(base: Readonly<ThemeValues>, display: Partial<ThemeValues> = {}, spec: DisplaySpec = DISPLAY_DEFAULT): Theme {
  const values: Readonly<ThemeValues> = Object.keys(display).length ? Object.freeze({ ...base, ...display }) : base, seen = new Map<TokenName, string>();
  const tok: Tok = (n) => {
    let v = seen.get(n);
    if (v === undefined) { v = tokIn(values, n); seen.set(n, v); }
    return v;
  };
  const list = (names: readonly TokenName[]): string[] => names.map(tok);
  return Object.freeze({ values, base, spec, tok, list, alpha: (c: TokenName | string, a: number | string) => alpha(c, a, values) });
}
/** The default look in the default display (the context value outside a theme provider, and of tests). */
export const DEFAULT_THEME: Theme = makeTheme(THEME_DEFAULT);

/** The theme of the app: library theme `def` (the case's active one or a `?theme=` link's) under the viewer's display `spec`. */
export function resolveAppTheme(def: Pick<ThemeDef, 'colours' | 'axes'>, spec: DisplaySpec): Theme {
  const base = themeBase(def);
  return makeTheme(base, themedDisplay(spec, def, base), spec);
}
/** The base table the printed exports read (the Excel workbooks, the HTML report): the theme without any display, so always light. */
export const printTheme = (def: Pick<ThemeDef, 'colours' | 'axes'>): Readonly<ThemeValues> => themeBase(def);
