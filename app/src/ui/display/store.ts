import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import { DISPLAY_DEFAULT, type DisplaySpec } from '@/domain/theme/modes';
import { loadPrefs, resolveDisplay, savePrefs, type DisplayPrefs, type SystemPrefs } from './prefs';

/**
 * The display slice (view state, like uiState): the viewer's preference, what the system asks for and the resolved display. The theme provider
 * (ui/brand/ThemeRuntime.tsx) resolves the theme under `spec` and provides it to the tree: a change re-renders what reads the theme, nothing re-mounts.
 */
export interface DisplayState { prefs: DisplayPrefs; system: SystemPrefs; spec: DisplaySpec }
const NO_SYSTEM: SystemPrefs = { dark: false, contrastMore: false, reducedMotion: false };
export const displayStore = createStore<DisplayState>(() => ({ prefs: loadPrefs(), system: NO_SYSTEM, spec: DISPLAY_DEFAULT }));
export const useDisplay = <T,>(select: (s: DisplayState) => T): T => useSyncExternalStore(displayStore.subscribe, () => select(displayStore.getState()));

const same = (a: DisplaySpec, b: DisplaySpec): boolean => a.mode === b.mode && a.contrast === b.contrast && a.cvd === b.cvd && a.reduceMotion === b.reduceMotion;
/** The attributes of <html> that switch the CSS blocks of tokens.css; none for the default display (the DOM stays as it was). */
export function displayAttributes(spec: DisplaySpec): Record<string, string | null> {
  return {
    'data-ac-mode': spec.mode === 'dark' ? 'dark' : null, 'data-ac-contrast': spec.contrast === 'standard' ? null : spec.contrast,
    'data-ac-cvd': spec.cvd ? 'on' : null, 'data-ac-motion': spec.reduceMotion ? 'reduce' : null,
  };
}
function apply(spec: DisplaySpec): void {
  const root = globalThis.document?.documentElement;
  if (root) for (const [k, v] of Object.entries(displayAttributes(spec))) { if (v == null) root.removeAttribute(k); else root.setAttribute(k, v); }
}
function update(prefs: DisplayPrefs, system: SystemPrefs): void {
  const s = displayStore.getState(), spec = resolveDisplay(prefs, system), changed = !same(spec, s.spec);
  if (changed) apply(spec);
  displayStore.setState({ prefs, system, spec: changed ? spec : s.spec });
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
