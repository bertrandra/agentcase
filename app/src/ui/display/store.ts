import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import { setDisplayTheme } from '@/domain/theme';
import { DISPLAY_DEFAULT, displayTheme, type DisplaySpec } from '@/domain/theme/modes';
import { loadPrefs, resolveDisplay, savePrefs, type DisplayPrefs, type SystemPrefs } from './prefs';

/**
 * The display slice (view state, like uiState): the viewer's preference, what the system asks for, the resolved display and a version that
 * the canvases subscribe to (the section host re-mounts on a change, so chart.js configs and `tok()` read-outs are rebuilt with the new values).
 */
export interface DisplayState { prefs: DisplayPrefs; system: SystemPrefs; spec: DisplaySpec; version: number }
const NO_SYSTEM: SystemPrefs = { dark: false, contrastMore: false, reducedMotion: false };
export const displayStore = createStore<DisplayState>(() => ({ prefs: loadPrefs(), system: NO_SYSTEM, spec: DISPLAY_DEFAULT, version: 0 }));
export const useDisplay = <T,>(select: (s: DisplayState) => T): T => useSyncExternalStore(displayStore.subscribe, () => select(displayStore.getState()));
export const displaySpec = (): DisplaySpec => displayStore.getState().spec;

const same = (a: DisplaySpec, b: DisplaySpec): boolean => a.mode === b.mode && a.contrast === b.contrast && a.cvd === b.cvd && a.reduceMotion === b.reduceMotion;
/** The attributes of <html> that switch the CSS blocks of tokens.css; none for the default display (the DOM stays as it was). */
export function displayAttributes(spec: DisplaySpec): Record<string, string | null> {
  return {
    'data-ac-mode': spec.mode === 'dark' ? 'dark' : null, 'data-ac-contrast': spec.contrast === 'standard' ? null : spec.contrast,
    'data-ac-cvd': spec.cvd ? 'on' : null, 'data-ac-motion': spec.reduceMotion ? 'reduce' : null,
  };
}
function apply(spec: DisplaySpec): void {
  setDisplayTheme(displayTheme(spec));
  const root = globalThis.document?.documentElement;
  if (root) for (const [k, v] of Object.entries(displayAttributes(spec))) { if (v == null) root.removeAttribute(k); else root.setAttribute(k, v); }
}
function update(prefs: DisplayPrefs, system: SystemPrefs): void {
  const s = displayStore.getState(), spec = resolveDisplay(prefs, system), changed = !same(spec, s.spec);
  if (changed) apply(spec);
  displayStore.setState({ prefs, system, spec, version: s.version + (changed ? 1 : 0) });
}
/** Change the viewer's preference (saved in this browser at once). */
export function setDisplayPrefs(patch: Partial<DisplayPrefs>): void {
  const prefs = { ...displayStore.getState().prefs, ...patch };
  savePrefs(prefs);
  update(prefs, displayStore.getState().system);
}

const QUERIES = { dark: '(prefers-color-scheme: dark)', contrastMore: '(prefers-contrast: more)', reducedMotion: '(prefers-reduced-motion: reduce)' } as const;
/** Read the stored preference and the system media queries, apply them, and follow the system live (an "auto" viewer switching the OS to dark). */
export function initDisplay(win: Window | undefined = globalThis.window): void {
  const mq = (q: string): MediaQueryList | null => { try { return win?.matchMedia?.(q) ?? null; } catch { return null; } };
  const lists = Object.fromEntries(Object.entries(QUERIES).map(([k, q]) => [k, mq(q)])) as Record<keyof SystemPrefs, MediaQueryList | null>;
  const read = (): SystemPrefs => ({ dark: !!lists.dark?.matches, contrastMore: !!lists.contrastMore?.matches, reducedMotion: !!lists.reducedMotion?.matches });
  for (const l of Object.values(lists)) l?.addEventListener?.('change', () => update(displayStore.getState().prefs, read()));
  update(loadPrefs(), read());
}
