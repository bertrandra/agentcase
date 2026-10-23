import { describe, expect, it } from 'vitest';
import { resolveTokens, THEME_DEFAULT, type ThemeValues, type TokenName } from '../../src/domain/theme';
import { contrastRatio, hexToRgb } from '../../src/domain/theme/color';
import { displayTheme, type ContrastLevel, type DisplayMode } from '../../src/domain/theme/modes';

/**
 * WCAG contrast of every text / background role pair, in each display mode x contrast level (docs/THEME.md §6.4). Thresholds:
 * standard AA (4.5:1 text, 3:1 UI and large text), enhanced 7:1 text, high 15:1 text (business colours as text: 7:1). Fails with the list of pairs below.
 */
type Pair = readonly [fg: TokenName, bg: TokenName];
const BODY: Pair[] = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface-raised'], ['ink', 'surface-muted'], ['ink', 'surface-tint'], ['ink', 'table-stripe'], ['ink', 'table-hover'], ['ink', 'hover'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-muted'], ['text-strong', 'surface'], ['text-soft', 'surface'], ['text-label', 'surface'],
  ['text-link', 'surface'], ['text-link', 'bg'], ['text-heading', 'surface'], ['text-heading', 'bg'], ['chart-axis', 'surface'],
  ['header-text', 'header-start'], ['header-text', 'header-end'], ['kpibar-text', 'kpibar-start'], ['kpibar-text', 'kpibar-end'],
  ['sidebar-text', 'sidebar-bg'], ['sidebar-item-text', 'sidebar-bg'], ['sidebar-group-text', 'sidebar-group-bg'], ['hover-text', 'hover'], ['selected-text', 'selected'],
  ['table-head-text', 'table-head-bg'], ['text-on-primary', 'primary-700'], ['text-inverse', 'ink'],
  ['ink', 'chart-div-neg-strong'], ['ink', 'chart-div-neg'], ['ink', 'chart-div-mid'], ['ink', 'chart-div-pos'],
];
/** Business colours written as text (teal "automation" figures, brick "glass ceiling"…). vFTE green is a graphic colour in the legacy look (3.4:1). */
const BUSINESS: Pair[] = (['automation', 'glass-ceiling', 'human-supervision', 'agentic', 'ai'] as const).map((n) => [n, 'surface'] as const);
const UI: Pair[] = [['focus', 'surface'], ['focus', 'bg'], ['focus-header', 'header-start'], ['vfte', 'surface'], ...Array.from({ length: 8 }, (_, i) => [`chart-cat-${i + 1}` as TokenName, 'surface'] as const)];
/** Lines must be visible (3:1) from the enhanced level on; the standard light lines are the legacy hairlines (#E3E3E3 on white). */
const LINES: Pair[] = [['line', 'surface'], ['line-strong', 'surface'], ['table-line', 'surface']];

const LIMITS: Record<ContrastLevel, { body: number; business: number; ui: number; lines: number }> = {
  standard: { body: 4.5, business: 4.5, ui: 3, lines: 0 }, enhanced: { body: 7, business: 7, ui: 3, lines: 3 }, high: { body: 15, business: 7, ui: 3, lines: 3 },
};

/**
 * Known legacy shortfalls of the default look, which must stay pixel-identical (docs/THEME.md §6.4): the focus ring of the header buttons is the brand
 * blue on the blue end of the header gradient. Every other level fixes it (white ring); T4 may adopt it for light / standard.
 */
const LEGACY = new Set(['light/standard focus-header']);

function table(mode: DisplayMode, contrast: ContrastLevel): ThemeValues {
  return { ...THEME_DEFAULT, ...displayTheme({ mode, contrast, cvd: false, reduceMotion: false }) } as ThemeValues;
}
function below(t: ThemeValues, pairs: Pair[], min: number, where: string): string[] {
  return pairs.filter(([fg]) => !LEGACY.has(`${where} ${fg}`)).flatMap(([fg, bg]) => {
    const a = resolveTokens(t[fg], t), b = resolveTokens(t[bg], t);
    if (!hexToRgb(a) || !hexToRgb(b)) return [`${fg} on ${bg}: not a solid colour (${a} / ${b})`];
    const r = contrastRatio(a, b);
    return r + 1e-9 < min ? [`${fg} ${a} on ${bg} ${b}: ${r.toFixed(2)} < ${min}`] : [];
  });
}

describe('theme contrast: every text / background role pair in each mode and contrast level', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const level of ['standard', 'enhanced', 'high'] as const) {
      it(`${mode} / ${level}`, () => {
        const t = table(mode, level), L = LIMITS[level], w = `${mode}/${level}`;
        const bad = [...below(t, BODY, L.body, w), ...below(t, BUSINESS, L.business, w), ...below(t, UI, L.ui, w), ...(L.lines ? below(t, LINES, L.lines, w) : [])];
        expect(bad.join("\n")).toBe("");
      });
    }
  }
  it('the colour-blind palette keeps 8 distinct series in every mode', () => {
    for (const mode of ['light', 'dark'] as const) for (const contrast of ['standard', 'high'] as const) {
      const t = { ...THEME_DEFAULT, ...displayTheme({ mode, contrast, cvd: true, reduceMotion: false }) } as ThemeValues;
      const cat = Array.from({ length: 8 }, (_, i) => resolveTokens(t[`chart-cat-${i + 1}` as TokenName], t));
      expect(new Set(cat).size, `${mode} ${contrast}`).toBe(8);
    }
  });
});
