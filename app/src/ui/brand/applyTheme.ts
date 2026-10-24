import type { DisplaySpec } from '@/domain/theme/modes';
import { AXIS_DEFAULTS } from '@/domain/theme/axes';
import { allTokenProps, colourProps, COLOUR_TOKENS } from '@/domain/theme/themeProps';
import type { Theme } from '@/domain/theme/resolve';
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

/** The CSS side of the app's theme: the inline colours of `theme` (resolved from `def` and the display) and the axes of `def`, on `<html>`. */
export function applyAppTheme(def: ThemeDef, theme: Theme, el: HTMLElement | null = globalThis.document?.documentElement ?? null): void {
  if (!el) return;
  writeThemeProps(el, Object.keys(def.colours).length ? colourProps(theme.values) : null);
  applyThemeAxes(def.axes, el);
}

/** A preview container: every token of the theme inline (it must not inherit the app's theme or axes), its axes as attributes too. */
export function applyPreviewTheme(def: ThemeDef, spec: DisplaySpec, el: HTMLElement): void {
  writeThemeProps(el, allTokenProps(def, spec));
  el.style.colorScheme = spec.mode;
  applyThemeAxes({ ...AXIS_DEFAULTS, ...def.axes }, el);
}
