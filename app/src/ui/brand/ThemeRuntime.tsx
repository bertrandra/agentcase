import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { activeTheme } from '@/domain/theme/library';
import { resolveAppTheme } from '@/domain/theme/resolve';
import { useDoc } from '@/store/hooks';
import { linkedTheme } from '@/store/themeView';
import { useDisplay } from '../display/store';
import { ThemeContext } from '../themeContext';
import { toast } from '../uiState';
import { applyAppTheme } from './applyTheme';
import { clearThemeOverride, useThemeView } from './themeView';

/**
 * Keeps the page in the theme in effect (docs/THEME.md §8.2): the `?theme=` link's theme, else the case's active theme, under the viewer's display.
 * Resolves it with the pure `resolveAppTheme()`, provides it to the tree (`useTheme()`) and writes its colours and axes on `<html>`. A theme or
 * display change re-renders the components that read the theme; nothing is re-mounted.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const themes = useDoc((d) => d.THEMES), active = useDoc((d) => d.ACTIVE_THEME), override = useThemeView((s) => s.override);
  const spec = useDisplay((s) => s.spec);
  const lib = useMemo(() => ({ THEMES: themes, ACTIVE_THEME: active }), [themes, active]);
  const linked = linkedTheme(lib, override);
  const def = linked ?? activeTheme(lib), key = JSON.stringify(def);
  // the resolved theme changes identity only when the theme content or the display changes: an edit elsewhere in the case keeps it
  const theme = useMemo(() => resolveAppTheme(JSON.parse(key) as typeof def, spec), [key, spec]);
  useLayoutEffect(() => {
    if (override !== null && !linked) {
      toast(Number.isNaN(override) ? 'The theme link is not a theme number: it is ignored.' : `Theme ${override} is not in this case's library: the link is ignored.`, 5000);
      clearThemeOverride();
    }
  }, [override, linked]);
  useLayoutEffect(() => { applyAppTheme(JSON.parse(key) as typeof def, theme); }, [key, theme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
