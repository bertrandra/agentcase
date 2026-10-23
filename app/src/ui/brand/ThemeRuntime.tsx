import { useLayoutEffect, useMemo, useRef } from 'react';
import { activeTheme, findTheme } from '@/domain/theme/library';
import { useDoc } from '@/store/hooks';
import { bumpDisplayVersion, useDisplay } from '../display/store';
import { toast, useUi } from '../uiState';
import { applyAppTheme } from './applyTheme';
import { clearThemeOverride, useThemeView } from './themeView';

/** The section that edits themes: its controls must not be re-mounted under the pointer (it previews without chart.js canvases). */
const EDITOR = 'brand-theme';

/**
 * Keeps the page in the theme in effect (docs/THEME.md §8.2): the `?theme=` link's theme, else the case's active theme, under the viewer's
 * display. Renders nothing. A theme switch re-mounts the section (canvases and `tok()` read-outs), except on the theme editor itself.
 */
export function ThemeRuntime() {
  const themes = useDoc((d) => d.THEMES), active = useDoc((d) => d.ACTIVE_THEME), override = useThemeView((s) => s.override);
  const spec = useDisplay((s) => s.spec), section = useUi((s) => s.activeSection);
  const lib = useMemo(() => ({ THEMES: themes, ACTIVE_THEME: active }), [themes, active]);
  const linked = override !== null && Number.isInteger(override) ? findTheme(lib, override) : undefined;
  const def = linked ?? activeTheme(lib), key = JSON.stringify(def), last = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (override !== null && !linked) {
      toast(Number.isNaN(override) ? 'The theme link is not a theme number: it is ignored.' : `Theme ${override} is not in this case's library: the link is ignored.`, 5000);
      clearThemeOverride();
    }
  }, [override, linked]);
  useLayoutEffect(() => {
    applyAppTheme(JSON.parse(key) as typeof def, spec);
    if (last.current !== null && last.current !== key && section !== EDITOR) bumpDisplayVersion();
    last.current = key;
  }, [key, spec, section]);
  return null;
}

