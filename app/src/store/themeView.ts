/** @calc-zone foundation */
import { createStore } from 'zustand/vanilla';
import { activeTheme, findTheme, type LibraryDoc } from '@/domain/theme/library';
import type { ThemeDef } from '@/domain/theme/themeDef';

/**
 * The `?theme=<seq>` link (docs/THEME.md §8.7): a view override, never in the case and never undoable. `override` is the sequence id the link asks
 * for; the UI theme provider validates it against the case's library (an unknown one is dropped with a message). It sits in the store layer because the
 * exports read it too: while it is on, the workbooks and the report use the viewed theme (controllers/exportTheme.ts).
 */
export interface ThemeViewState { override: number | null }
export const themeViewStore = createStore<ThemeViewState>(() => ({ override: null }));
export const setThemeOverride = (seq: number | null): void => themeViewStore.setState({ override: seq });

/** The theme the link asks for when the case's library has it (undefined: no link, or an unknown / malformed number). */
export function linkedTheme(lib: LibraryDoc, override: number | null): ThemeDef | undefined {
  return override !== null && Number.isInteger(override) ? findTheme(lib, override) : undefined;
}
/** The library theme in effect: the link's, else the case's active theme (pure). */
export const themeInEffect = (lib: LibraryDoc, override: number | null): ThemeDef => linkedTheme(lib, override) ?? activeTheme(lib);
