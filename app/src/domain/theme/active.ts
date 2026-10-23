/** @calc-zone presentation */
/**
 * The library theme in effect for `tok()` (docs/THEME.md §8.2): the case's active theme, or the one a `?theme=` link shows. Switching it sets the
 * base theme (`setActiveTheme`: charts, the Excel workbooks and the HTML report read it) and recomputes the viewer's display over it.
 */
import { axisTokens } from './axes';
import { BUILTIN_THEMES } from './catalogue';
import { themeOverrides } from './derive';
import { baseTheme, setActiveTheme, setDisplayTheme, type ThemeValues } from './index';
import { DISPLAY_DEFAULT, type DisplaySpec } from './modes';
import { themedDisplay } from './themedDisplay';
import type { ThemeDef } from './themeDef';

let active: ThemeDef = BUILTIN_THEMES[0]!, spec: DisplaySpec = DISPLAY_DEFAULT;

/** The display overrides of `display` over the active theme (the display store calls this on a preference change). */
export function displayFor(display: DisplaySpec): Partial<ThemeValues> {
  spec = display;
  return themedDisplay(display, active, baseTheme());
}
/** Make `def` the theme of `tok()` and of the exports; the display in effect is recomputed over it. */
export function setActiveThemeDef(def: ThemeDef): void {
  active = def;
  setActiveTheme({ ...themeOverrides(def), ...axisTokens(def.axes) });
  setDisplayTheme(displayFor(spec));
}
export const activeThemeDef = (): ThemeDef => active;
