/** @calc-zone presentation */
import { contrastRatio, hexToRgb } from './color';
import { resolveTokens, type ThemeValues, type TokenName } from './index';
import type { ContrastLevel } from './modes';

/**
 * The text / background role pairs of the contrast test (docs/THEME.md §7.4), shared by the default theme test, the catalogue test (§8) and the
 * palette generator's guard (§8.9: a generated palette is checked against them before it is returned).
 * Thresholds: standard AA (4.5:1 text, 3:1 UI and large text), enhanced 7:1 text, high 15:1 text (business colours as text: 7:1).
 */
export type Pair = readonly [fg: TokenName, bg: TokenName];
export const BODY: Pair[] = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface-raised'], ['ink', 'surface-muted'], ['ink', 'surface-tint'], ['ink', 'table-stripe'], ['ink', 'table-hover'], ['ink', 'hover'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-muted'], ['text-strong', 'surface'], ['text-soft', 'surface'], ['text-label', 'surface'],
  ['text-link', 'surface'], ['text-link', 'bg'], ['text-heading', 'surface'], ['text-heading', 'bg'], ['chart-axis', 'surface'],
  ['header-text', 'header-start'], ['header-text', 'header-end'], ['kpibar-text', 'kpibar-start'], ['kpibar-text', 'kpibar-end'],
  ['sidebar-text', 'sidebar-bg'], ['sidebar-item-text', 'sidebar-bg'], ['sidebar-group-text', 'sidebar-group-bg'], ['hover-text', 'hover'], ['selected-text', 'selected'],
  ['table-head-text', 'table-head-bg'], ['table-head-note', 'table-head-bg'], ['text-on-primary', 'primary-700'], ['text-inverse', 'ink'],
  ['ink', 'chart-div-neg-strong'], ['ink', 'chart-div-neg'], ['ink', 'chart-div-mid'], ['ink', 'chart-div-pos'],
];
/** Business colours written as text (teal "automation" figures, brick "glass ceiling"…). vFTE green is a graphic colour in the legacy look (3.4:1). */
export const BUSINESS: Pair[] = (['automation', 'glass-ceiling', 'human-supervision', 'agentic', 'ai'] as const).map((n) => [n, 'surface'] as const);
export const UI: Pair[] = [['focus', 'surface'], ['focus', 'bg'], ['focus-header', 'header-start'], ['vfte', 'surface'], ...Array.from({ length: 8 }, (_, i) => [`chart-cat-${i + 1}` as TokenName, 'surface'] as const)];
/** Lines must be visible (3:1) from the enhanced level on; the standard light lines are the legacy hairlines (#E3E3E3 on white). */
export const LINES: Pair[] = [['line', 'surface'], ['line-strong', 'surface'], ['table-line', 'surface']];

export const LIMITS: Record<ContrastLevel, { body: number; business: number; ui: number; lines: number }> = {
  standard: { body: 4.5, business: 4.5, ui: 3, lines: 0 }, enhanced: { body: 7, business: 7, ui: 3, lines: 3 }, high: { body: 15, business: 7, ui: 3, lines: 3 },
};

/** The pairs of `pairs` below `min` in table `t` (`skip`: "<where> <fg>" entries of known, recorded shortfalls). */
export function below(t: ThemeValues, pairs: Pair[], min: number, where: string, skip: ReadonlySet<string> = new Set()): string[] {
  return pairs.filter(([fg]) => !skip.has(`${where} ${fg}`)).flatMap(([fg, bg]) => {
    const a = resolveTokens(t[fg], t), b = resolveTokens(t[bg], t);
    if (!hexToRgb(a) || !hexToRgb(b)) return [`${fg} on ${bg}: not a solid colour (${a} / ${b})`];
    const r = contrastRatio(a, b);
    return r + 1e-9 < min ? [`${fg} ${a} on ${bg} ${b}: ${r.toFixed(2)} < ${min}`] : [];
  });
}
/** Every failing pair of a table at a contrast level. */
export function failures(t: ThemeValues, level: ContrastLevel, where: string, skip?: ReadonlySet<string>): string[] {
  const L = LIMITS[level];
  return [...below(t, BODY, L.body, where, skip), ...below(t, BUSINESS, L.business, where, skip), ...below(t, UI, L.ui, where, skip), ...(L.lines ? below(t, LINES, L.lines, where, skip) : [])];
}
