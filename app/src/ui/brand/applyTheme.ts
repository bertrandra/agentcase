import { setActiveThemeDef } from '@/domain/theme/active';
import type { DisplaySpec } from '@/domain/theme/modes';
import { AXIS_DEFAULTS } from '@/domain/theme/axes';
import { allTokenProps, COLOUR_TOKENS, themeProps } from '@/domain/theme/themeProps';
import type { ThemeDef } from '@/domain/theme/themeDef';
import { applyThemeAxes } from '../themeAxes';

/**
 * Applying a library theme (docs/THEME.md §8.2). Chosen mechanism: the derived colour values, display included, as inline custom properties on the
 * element (`<html>` for the app, the container for a preview); they are rewritten on every theme or display change. The default theme removes
 * them, so the generated tokens.css (and its display blocks) paints the app as before. Axes are `data-ac-*` attributes (themeAxes.ts).
 */
export function writeThemeProps(el: HTMLElement, props: Record<string, string> | null): void {
  if (!props) {
    for (const n of COLOUR_TOKENS) el.style.removeProperty(`--ac-${n}`);
    if (!el.style.length) el.removeAttribute('style');
    return;
  }
  for (const [k, v] of Object.entries(props)) if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v);
}

/** The app's theme: `tok()` and the exports (domain), the inline colours and the axes of `<html>`. */
export function applyAppTheme(def: ThemeDef, spec: DisplaySpec, el: HTMLElement | null = globalThis.document?.documentElement ?? null): void {
  setActiveThemeDef(def);
  if (!el) return;
  writeThemeProps(el, themeProps(def, spec));
  applyThemeAxes(def.axes, el);
}

/** A preview container: every token of the theme inline (it must not inherit the app's theme or axes), its axes as attributes too. */
export function applyPreviewTheme(def: ThemeDef, spec: DisplaySpec, el: HTMLElement): void {
  writeThemeProps(el, allTokenProps(def, spec));
  el.style.colorScheme = spec.mode;
  applyThemeAxes({ ...AXIS_DEFAULTS, ...def.axes }, el);
}
