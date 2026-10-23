import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';

/**
 * The `?theme=<seq>` link (docs/THEME.md §8.7): a view override, never in the case and never undoable. The page shows that theme until the viewer
 * clears it or makes it the case theme; the case and its history are untouched. `override` is the sequence id the link asks for (validated against
 * the case's library by the theme runtime, which drops an unknown one with a message).
 */
export interface ThemeViewState { override: number | null }
export const themeViewStore = createStore<ThemeViewState>(() => ({ override: null }));
export const useThemeView = <T,>(select: (s: ThemeViewState) => T): T => useSyncExternalStore(themeViewStore.subscribe, () => select(themeViewStore.getState()));

/** The sequence id of a `?theme=` query (null without one, NaN for a value that is not a positive whole number). */
export function themeParam(search: string): number | null {
  const v = new URLSearchParams(search).get('theme');
  if (v === null) return null;
  return /^\d{1,6}$/.test(v.trim()) ? Number(v.trim()) : Number.NaN;
}
/** Read the link of the page at boot (a saved HTML copy honours it too). */
export function initThemeLink(loc: Pick<Location, 'search'> | undefined = globalThis.location): void {
  const n = loc ? themeParam(loc.search) : null;
  themeViewStore.setState({ override: n });
}
export const setThemeOverride = (seq: number | null): void => themeViewStore.setState({ override: seq });
/** Drop the override and the query parameter (the address bar no longer asks for it on reload). */
export function clearThemeOverride(): void {
  themeViewStore.setState({ override: null });
  try {
    const u = new URL(globalThis.location.href);
    if (u.searchParams.has('theme')) { u.searchParams.delete('theme'); globalThis.history.replaceState(globalThis.history.state, '', u.toString()); }
  } catch { /* no location (tests, file:// quirks): the override is gone anyway */ }
}
/** The link that opens this page in a theme: the page address with `?theme=<seq>`. */
export function themeLink(seq: number, href: string = globalThis.location?.href ?? ''): string {
  try { const u = new URL(href); u.searchParams.set('theme', String(seq)); return u.toString(); } catch { return `?theme=${seq}`; }
}
