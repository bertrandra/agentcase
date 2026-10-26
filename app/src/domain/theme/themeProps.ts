/** @calc-zone presentation */
/**
 * The CSS side of a library theme (docs/THEME.md §8.2): the colour tokens as inline custom properties, for `<html>` (the app) or a preview
 * container. Inline properties beat the generated display blocks of tokens.css, so the set already carries the display in effect (dark, contrast,
 * colour-blind series): it is recomputed on every theme or display change. The default theme writes nothing (`null`): the app keeps the
 * generated CSS untouched, pixel for pixel. A theme with axes only writes nothing either: its axes are `data-ac-*` attributes.
 */
import { themeBase } from './derive';
import type { ThemeValues, TokenName } from './index';
import type { DisplaySpec } from './modes';
import { ALPHAS, SCALES } from './scales';
import { CHART, EXPORT, ROLES } from './semantic';
import { themedDisplay } from './themedDisplay';
import type { ThemeDef } from './themeDef';

/** Every colour token: scale steps, translucent steps, roles, charts, export colours (the report fonts are not colours). */
export const COLOUR_TOKENS: readonly TokenName[] = [
  ...Object.entries(SCALES).flatMap(([f, steps]) => Object.keys(steps).map((s) => `${f}-${s}`)), ...Object.keys(ALPHAS), ...Object.keys(ROLES),
  ...Object.keys(CHART),
  ...Object.keys(EXPORT).filter((n) => !n.startsWith('report-font')),
] as TokenName[];

const css = (v: string): string => v.replace(/\{([a-z0-9-]+)\}/g, 'var(--ac-$1)');

/** `--ac-<name>` → value of every colour token of `def` under `spec`; null when the theme sets no colour (the generated CSS applies). */
export function themeProps(def: Pick<ThemeDef, 'colours' | 'axes'>, spec: DisplaySpec): Record<string, string> | null {
  if (!Object.keys(def.colours).length) return null;
  const base = themeBase(def);
  return colourProps({ ...base, ...themedDisplay(spec, def, base) } as ThemeValues);
}
/** `--ac-<name>` → value of every colour token of an already resolved table (base + display). */
export const colourProps = (t: Readonly<ThemeValues>): Record<string, string> => Object.fromEntries(COLOUR_TOKENS.map((n) => [`--ac-${n}`, css(t[n])]));
/** Every token of `def` under `spec` (colours, type, shape, density, axes): a preview container is then independent of the app's theme and axes. */
export function allTokenProps(def: Pick<ThemeDef, 'colours' | 'axes'>, spec: DisplaySpec): Record<string, string> {
  const base = themeBase(def), t = { ...base, ...themedDisplay(spec, def, base) } as ThemeValues;
  return Object.fromEntries(Object.entries(t).map(([n, v]) => [`--ac-${n}`, css(v)]));
}
