import { createContext, useContext, useMemo } from 'react';
import type { TokenName } from '@/domain/theme';
import { DEFAULT_THEME, type Theme, type Tok } from '@/domain/theme/resolve';

export type { Theme, Tok } from '@/domain/theme/resolve';

/**
 * The theme in effect at run time (docs/THEME.md §2, §8.2): the case's library theme (or a `?theme=` link's) under the viewer's display, resolved by
 * the pure `resolveAppTheme()`. Provided by `ThemeProvider` (ui/brand/ThemeRuntime.tsx, in the shell); outside it (tests, a lone widget) the default
 * look. Together with the custom properties the provider writes on `<html>` it is the ONLY runtime theme state: domain and store hold none.
 *
 * A component that computes a colour in TS (chart.js configs, colour arithmetic, a hex for a data colour) reads it here, so a theme or display change
 * re-renders it in place (no remount: open tabs, drafts and scroll positions stay). CSS and inline `var(--ac-…)` values follow the custom properties
 * without any re-render.
 */
export const ThemeContext = createContext<Theme>(DEFAULT_THEME);

/** The theme in effect: `tok(name)`, `list(names)`, `alpha(token | hex, a)`, the resolved `values`, the print `base` and the display `spec`. */
export const useTheme = (): Theme => useContext(ThemeContext);

/** A map of colour roles resolved with `tok`: `{ real: 'chart-cat-2', … }` → `{ real: '#006e79', … }` (a chart builder handed `tok`). */
export const resolveRoles = <K extends string>(roles: Readonly<Record<K, TokenName>>, tok: Tok): Record<K, string> =>
  Object.fromEntries(Object.entries(roles).map(([k, v]) => [k, tok(v as TokenName)])) as Record<K, string>;

/** The same in a component, memoised per theme: it changes identity only when the theme in effect changes. */
export function useRoles<K extends string>(roles: Readonly<Record<K, TokenName>>): Record<K, string> {
  const { tok } = useTheme();
  return useMemo(() => resolveRoles(roles, tok), [roles, tok]);
}
