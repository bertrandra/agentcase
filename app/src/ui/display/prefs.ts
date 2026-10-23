import type { ContrastLevel, DisplayMode, DisplaySpec } from '@/domain/theme/modes';

/**
 * The viewer's display preference (docs/THEME.md §6.5): stored in this browser only (localStorage `agentcase.display`), never in the case,
 * never undoable. A missing, blocked or malformed entry gives the defaults: light, standard contrast, no option (the legacy look).
 */
export interface DisplayPrefs { mode: DisplayMode | 'auto'; contrast: ContrastLevel; reduceMotion: boolean; cvd: boolean }
export const PREFS_DEFAULT: Readonly<DisplayPrefs> = Object.freeze({ mode: 'light', contrast: 'standard', reduceMotion: false, cvd: false });
export const PREFS_KEY = 'agentcase.display';

/** What the system asks for (prefers-color-scheme, prefers-contrast, prefers-reduced-motion). */
export interface SystemPrefs { dark: boolean; contrastMore: boolean; reducedMotion: boolean }

const MODES = ['light', 'dark', 'auto'] as const, LEVELS = ['standard', 'enhanced', 'high'] as const;
/** A stored value read back with every field checked (an unknown field value falls back to its default). */
export function parsePrefs(raw: string | null): DisplayPrefs {
  let o: Record<string, unknown> = {};
  try { const v: unknown = raw ? JSON.parse(raw) : {}; if (v && typeof v === 'object' && !Array.isArray(v)) o = v as Record<string, unknown>; } catch { /* malformed: defaults */ }
  return {
    mode: MODES.find((m) => m === o.mode) ?? PREFS_DEFAULT.mode, contrast: LEVELS.find((l) => l === o.contrast) ?? PREFS_DEFAULT.contrast,
    reduceMotion: o.reduceMotion === true, cvd: o.cvd === true,
  };
}
export function loadPrefs(): DisplayPrefs {
  try { return parsePrefs(globalThis.localStorage?.getItem(PREFS_KEY) ?? null); } catch { return { ...PREFS_DEFAULT }; }
}
export function savePrefs(p: DisplayPrefs): void {
  try { globalThis.localStorage?.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* storage blocked: the choice lasts for this page only */ }
}

/** "Auto" resolved against the system: its colour scheme, and its "more contrast" request lifting standard to enhanced; reduced motion from either side. */
export function resolveDisplay(p: DisplayPrefs, sys: SystemPrefs): DisplaySpec {
  const auto = p.mode === 'auto';
  return {
    mode: p.mode === 'auto' ? (sys.dark ? 'dark' : 'light') : p.mode,
    contrast: auto && p.contrast === 'standard' && sys.contrastMore ? 'enhanced' : p.contrast,
    cvd: p.cvd, reduceMotion: p.reduceMotion || sys.reducedMotion,
  };
}
