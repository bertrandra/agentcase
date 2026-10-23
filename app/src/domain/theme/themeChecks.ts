/** @calc-zone presentation */
/**
 * The live contrast badges of the theme editor (docs/THEME.md §8.8): for each colour a theme can set, the text / graphic pair it paints and the
 * WCAG level it reaches in a display mode (AAA >= 7, AA >= 4.5, graphics >= 3). A failing pair is shown as a warning; it does not block an edit.
 */
import { contrastRatio } from './color';
import { resolveTokens, type ThemeValues, type TokenName } from './index';
import type { DisplayMode } from './modes';
import { themeBase } from './derive';
import { themedDisplay } from './themedDisplay';
import type { ColourKey, ThemeDef } from './themeDef';

type Check = readonly [fg: TokenName, bg: TokenName, min: number];
const CAT = (k: TokenName): Check => [k, 'surface', 3];
/** The pair each settable colour is checked on (none for the lines: the default hairlines are decorative). */
export const CHECKS: Partial<Record<ColourKey, Check>> = {
  primary: ['text-on-primary', 'primary-700', 4.5], secondary: ['agentic', 'surface', 4.5], info: ['ai', 'surface', 4.5], teal: ['automation', 'surface', 4.5],
  success: ['success-600', 'surface', 3], warning: ['human-supervision', 'surface', 4.5], danger: ['glass-ceiling', 'surface', 4.5], neutral: ['ink', 'surface', 4.5],
  slate: ['slate-700', 'surface', 4.5], bg: ['ink', 'bg', 4.5], surface: ['ink', 'surface', 4.5], 'surface-raised': ['ink', 'surface-raised', 4.5],
  'header-start': ['header-text', 'header-start', 4.5], 'header-end': ['header-text', 'header-end', 4.5], 'header-text': ['header-text', 'header-start', 4.5],
  'kpibar-start': ['kpibar-text', 'kpibar-start', 4.5], 'kpibar-end': ['kpibar-text', 'kpibar-end', 4.5], 'kpibar-text': ['kpibar-text', 'kpibar-start', 4.5],
  'sidebar-bg': ['sidebar-text', 'sidebar-bg', 4.5], 'sidebar-text': ['sidebar-text', 'sidebar-bg', 4.5], 'sidebar-group-bg': ['sidebar-group-text', 'sidebar-group-bg', 4.5],
  'sidebar-group-text': ['sidebar-group-text', 'sidebar-group-bg', 4.5], selected: ['selected-text', 'selected', 4.5],
  'table-head-bg': ['table-head-text', 'table-head-bg', 4.5], 'table-head-text': ['table-head-text', 'table-head-bg', 4.5], 'table-stripe': ['ink', 'table-stripe', 4.5],
  ink: ['ink', 'surface', 4.5], 'text-heading': ['text-heading', 'surface', 4.5], 'text-link': ['text-link', 'surface', 4.5], focus: ['focus', 'surface', 3],
  automation: ['automation', 'surface', 4.5], 'glass-ceiling': ['glass-ceiling', 'surface', 4.5], 'human-supervision': ['human-supervision', 'surface', 4.5],
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`chart-cat-${i + 1}`, CAT(`chart-cat-${i + 1}` as TokenName)])),
};

export interface CheckResult { key: ColourKey; fg: TokenName; bg: TokenName; ratio: number; min: number; level: 'AAA' | 'AA' | 'AA large' | 'Fail'; ok: boolean }
export const levelOf = (ratio: number, min: number): CheckResult['level'] => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 && min <= 3 ? 'AA large' : 'Fail');

/** The resolved table of a theme in a mode (standard contrast). */
export function themeTable(def: Pick<ThemeDef, 'colours' | 'axes'>, mode: DisplayMode): ThemeValues {
  const base = themeBase(def);
  return { ...base, ...themedDisplay({ mode, contrast: 'standard', cvd: false, reduceMotion: false }, def, base) } as ThemeValues;
}
/** The check of every settable colour of a theme in a mode. */
export function themeChecks(def: Pick<ThemeDef, 'colours' | 'axes'>, mode: DisplayMode): CheckResult[] {
  const t = themeTable(def, mode);
  return (Object.entries(CHECKS) as [ColourKey, Check][]).map(([key, [fg, bg, min]]) => {
    const ratio = contrastRatio(resolveTokens(t[fg], t), resolveTokens(t[bg], t));
    return { key, fg, bg, ratio, min, level: levelOf(ratio, min), ok: ratio + 1e-9 >= min };
  });
}
/** The value a colour key shows in the editor: the anchor step of a scale, the role itself otherwise. */
export const shownToken = (k: ColourKey): TokenName => (({ primary: 'primary-700', secondary: 'secondary-600', info: 'info-700', teal: 'teal-700', success: 'success-600',
  warning: 'warning-600', danger: 'danger-800', neutral: 'neutral-900', slate: 'slate-700' }) as Record<string, TokenName>)[k] ?? (k as TokenName);
