import { describe, expect, it } from 'vitest';
import { resolveTokens, THEME_DEFAULT, type ThemeValues, type TokenName } from '../../src/domain/theme';
import { BUILTIN_THEMES, RAINBOW_ZONES } from '../../src/domain/theme/catalogue';
import { contrastRatio } from '../../src/domain/theme/color';
import { themeBase, themeOverrides } from '../../src/domain/theme/derive';
import { displayTheme } from '../../src/domain/theme/modes';
import { themedDisplay } from '../../src/domain/theme/themedDisplay';
import { failures } from '../helpers/contrastPairs';

/** The built-in themes (docs/THEME.md §8.3): contrast in every display mode x level, the default one untouched, Rainbow readable. */
const table = (t: (typeof BUILTIN_THEMES)[number], mode: 'light' | 'dark', contrast: 'standard' | 'enhanced' | 'high'): ThemeValues => {
  const base = themeBase(t);
  return { ...base, ...themedDisplay({ mode, contrast, cvd: false, reduceMotion: false }, t, base) } as ThemeValues;
};

describe('theme catalogue', () => {
  it('has the seven built-ins with sequence ids 1-7, Capgemini first and empty', () => {
    expect(BUILTIN_THEMES.map((t) => `${t.seq} ${t.name}`)).toEqual(['1 Capgemini', '2 Orange', '3 Sprint', '4 Rainbow', '5 Sepia', '6 Dark red', '7 Purple']);
    expect(themeOverrides(BUILTIN_THEMES[0]!)).toEqual({});
    expect(themeBase(BUILTIN_THEMES[0]!)).toBe(THEME_DEFAULT);
    for (const mode of ['light', 'dark'] as const) for (const contrast of ['standard', 'enhanced', 'high'] as const) {
      const spec = { mode, contrast, cvd: false, reduceMotion: false };
      expect(themedDisplay(spec, BUILTIN_THEMES[0]!)).toEqual(displayTheme(spec));
    }
  });
  for (const t of BUILTIN_THEMES.filter((x) => !x.diagnostic && x.seq !== 1)) {
    for (const mode of ['light', 'dark'] as const) for (const level of ['standard', 'enhanced', 'high'] as const) {
      it(`${t.name}: ${mode} / ${level} passes the contrast pairs`, () => {
        expect(failures(table(t, mode, level), level, `${mode}/${level}`).join('\n')).toBe('');
      });
    }
  }
  it('Rainbow (diagnostic, exempt from the full test) keeps its text readable on every zone it paints (4.5:1)', () => {
    const t = table(BUILTIN_THEMES[3]!, 'light', 'standard'), r = (n: string) => resolveTokens(t[n as TokenName], t);
    const pairs = [['header-text', 'header-start'], ['header-text', 'header-end'], ['kpibar-text', 'kpibar-start'], ['kpibar-text', 'kpibar-end'], ['sidebar-text', 'sidebar-bg'],
      ['sidebar-item-text', 'sidebar-bg'], ['sidebar-group-text', 'sidebar-group-bg'], ['selected-text', 'selected'], ['ink', 'bg'], ['ink', 'surface-raised'], ['ink', 'surface'],
      ['ink', 'table-stripe'], ['table-head-text', 'table-head-bg'], ['text-on-primary', 'primary-700'], ['text-link', 'surface'], ['text-heading', 'surface-raised']];
    expect(pairs.filter(([f, b]) => contrastRatio(r(f!), r(b!)) < 4.5).map(([f, b]) => `${f} on ${b}: ${contrastRatio(r(f!), r(b!)).toFixed(2)}`)).toEqual([]);
    const zones = RAINBOW_ZONES.map(([, tok]) => r(tok));
    expect(new Set(zones).size).toBe(zones.length);   // each zone its own colour
  });
});
