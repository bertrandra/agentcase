import { describe, expect, it } from 'vitest';
import { resolveTokens, THEME_DEFAULT, type ThemeValues, type TokenName } from '../../src/domain/theme';
import { displayTheme, type ContrastLevel, type DisplayMode } from '../../src/domain/theme/modes';
import { failures } from '../helpers/contrastPairs';

/** WCAG contrast of every text / background role pair in each display mode x contrast level (docs/THEME.md §7.4; pairs and thresholds: helpers/contrastPairs). */

/**
 * Known legacy shortfalls of the default look, which must stay pixel-identical (docs/THEME.md §6.4): the focus ring of the header buttons is the brand
 * blue on the blue end of the header gradient. Every other level fixes it (white ring); the library themes adopt the header text colour (§8).
 */
const LEGACY = new Set(['light/standard focus-header']);

function table(mode: DisplayMode, contrast: ContrastLevel): ThemeValues {
  return { ...THEME_DEFAULT, ...displayTheme({ mode, contrast, cvd: false, reduceMotion: false }) } as ThemeValues;
}

describe('theme contrast: every text / background role pair in each mode and contrast level', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const level of ['standard', 'enhanced', 'high'] as const) {
      it(`${mode} / ${level}`, () => {
        expect(failures(table(mode, level), level, `${mode}/${level}`, LEGACY).join('\n')).toBe('');
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
