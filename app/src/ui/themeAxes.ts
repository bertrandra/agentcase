import { createContext, useContext, useSyncExternalStore } from 'react';
import { AXES, AXIS_DEFAULTS, AXIS_NAMES, axisAttr, axisAttributes, isAxisValue, type AxisName, type ThemeAxes } from '@/domain/theme/axes';

/**
 * The theme axes at run time (docs/THEME.md §6). The single source is the set of `data-ac-*` attributes on `<html>`: the CSS blocks of axes.css
 * read them, and the Field* controls subscribe to them here. A theme (T4: from the case, the Brand & theme screen, a preset) applies with
 * `applyThemeAxes()`; the values `tok()` returns come from `axisTokens(axes)` in the theme's base table (`resolveAppTheme()`).
 */
const rootEl = (): HTMLElement | null => (typeof document === 'undefined' ? null : document.documentElement);

/** Set every axis on `el` (default `<html>`): a value equal to the default, or missing, removes the attribute (the default look has none). */
export function applyThemeAxes(axes: Partial<ThemeAxes>, el: HTMLElement | null = rootEl()): void {
  if (!el) return;
  const attrs = axisAttributes(axes);
  for (const k of AXIS_NAMES) {
    const a = axisAttr(k), v = attrs[a];
    if (v === undefined) el.removeAttribute(a);
    else if (el.getAttribute(a) !== v) el.setAttribute(a, v);
  }
}

/** The axes currently applied on `el` (an unknown attribute value reads as the default). */
export function readThemeAxes(el: HTMLElement | null = rootEl()): ThemeAxes {
  const out = { ...AXIS_DEFAULTS } as Record<AxisName, string>;
  if (el) for (const k of AXIS_NAMES) { const v = el.getAttribute(axisAttr(k)); if (isAxisValue(k, v)) out[k] = v; }
  return out as ThemeAxes;
}

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const el = rootEl();
  if (!observer && el && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => listeners.forEach((l) => l()));
    observer.observe(el, { attributes: true, attributeFilter: AXIS_NAMES.map(axisAttr) });
  }
  return () => { listeners.delete(cb); if (!listeners.size) { observer?.disconnect(); observer = null; } };
}

/** The axes of a sub-tree that shows another theme (the Brand & theme live preview): the Field* controls inside follow it, not `<html>`. */
export const ThemeAxesContext = createContext<Partial<ThemeAxes> | null>(null);

/** The value of one axis, re-rendering when the attribute changes (inside a ThemeAxesContext: that theme's value). */
export function useThemeAxis<K extends AxisName>(k: K): ThemeAxes[K] {
  const scoped = useContext(ThemeAxesContext);
  const root = useSyncExternalStore(subscribe, () => { const v = rootEl()?.getAttribute(axisAttr(k)); return isAxisValue(k, v) ? v : AXES[k].default; }, () => AXES[k].default) as ThemeAxes[K];
  if (!scoped) return root;
  const v = scoped[k];
  return (isAxisValue(k, v) ? v : AXES[k].default) as ThemeAxes[K];
}
