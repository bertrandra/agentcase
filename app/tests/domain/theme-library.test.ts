import { describe, expect, it } from 'vitest';
import { argb, THEME_DEFAULT, tokIn, type TokenName } from '@/domain/theme';
import { printTheme, resolveAppTheme } from '@/domain/theme/resolve';
import { BUILTIN_THEMES } from '@/domain/theme/catalogue';
import { hexToRgb, toOklch } from '@/domain/theme/color';
import { familyFrom, themeBase, themeOverrides } from '@/domain/theme/derive';
import { activeSeq, activeTheme, nextSeq, parseTheme, uniqueName, userThemes } from '@/domain/theme/library';
import { SCALES } from '@/domain/theme/scales';
import { readThemeFile, ThemeFileError, themeFileJson } from '@/domain/theme/themeFile';
import { themeProps } from '@/domain/theme/themeProps';
import { SCALE_ANCHORS, type ScaleKey } from '@/domain/theme/themeDef';
import { DISPLAY_DEFAULT } from '@/domain/theme/modes';

const L = (hex: string) => toOklch(hexToRgb(hex)!)[0];
const PURPLE = BUILTIN_THEMES[6]!;

describe('theme derivation (docs/THEME.md §8.1)', () => {
  it('the default theme derives exactly the current tokens: no override, no inline property', () => {
    expect(themeOverrides(BUILTIN_THEMES[0]!)).toEqual({});
    expect(themeBase(BUILTIN_THEMES[0]!)).toBe(THEME_DEFAULT);
    expect(themeProps(BUILTIN_THEMES[0]!, DISPLAY_DEFAULT)).toBeNull();
    for (const f of Object.keys(SCALE_ANCHORS) as ScaleKey[]) expect(familyFrom(f, (SCALES[f] as Record<number, string>)[SCALE_ANCHORS[f]]!)).toEqual({});
  });
  it.each(['#5b2a9e', '#16693a', '#b84a00', '#7a4a24', '#336699', '#cc0000'])('an anchor %s lands on its step and every family stays ordered by lightness', (anchor) => {
    for (const f of Object.keys(SCALE_ANCHORS) as ScaleKey[]) {
      const steps = familyFrom(f, anchor), list = Object.keys(SCALES[f]).map(Number).sort((a, b) => a - b);
      expect(steps[`${f}-${SCALE_ANCHORS[f]}`]).toBe(anchor);
      for (let i = 1; i < list.length; i++) expect(L(steps[`${f}-${list[i]}`]!), `${f}-${list[i]}`).toBeLessThanOrEqual(L(steps[`${f}-${list[i - 1]}`]!) + 0.005);
    }
  });
  it('a family keeps the hue of its anchor; white and black stay white and black', () => {
    const s = familyFrom('primary', '#5b2a9e'), hue = (h: string) => toOklch(hexToRgb(h)!)[2];
    expect(Math.abs(hue(s['primary-200']!) - hue('#5b2a9e'))).toBeLessThan(25);
    const n = familyFrom('neutral', '#3b2e22');
    expect([n['neutral-0'], n['neutral-1000']]).toEqual(['#ffffff', '#000000']);
  });
  it('translucent steps are re-made on their new base; roles are set as given; the header focus ring takes the header text', () => {
    const o = themeOverrides(PURPLE) as Record<string, string>, rgb = hexToRgb(o['primary-975']!)!;
    expect(o['primary-975-a8']).toBe(`rgba(${rgb.join(',')},0.08)`);
    expect(o['header-start']).toBe('#5b2a9e');
    expect(o['focus-header']).toBe('{header-text}');
    expect(o['teal-700']).toBeUndefined();   // business families untouched
  });
  it('a resolved theme reaches tok(), the print theme of the exports (report tokens / argb) and the display over it', () => {
    const t = resolveAppTheme(PURPLE, DISPLAY_DEFAULT), print = printTheme(PURPLE);
    expect(t.tok('header-start')).toBe('#5b2a9e');
    expect(tokIn(print, 'report-heading')).toBe('#5b2a9e');
    expect(argb(print, 'excel-head-bg')).not.toBe('FF1E2761');
    expect(argb(THEME_DEFAULT, 'excel-head-bg')).toBe('FF1E2761');
    const dark = resolveAppTheme(PURPLE, { ...DISPLAY_DEFAULT, mode: 'dark' });
    expect(dark.tok('header-start')).not.toBe('#163a6b');   // the dark header turns to the theme's hue
    expect(dark.tok('header-start')).not.toBe('#5b2a9e');
    expect(tokIn(dark.base, 'header-start')).toBe('#5b2a9e');   // the printed exports stay light
    expect(t.tok('header-start')).toBe('#5b2a9e');   // resolving another display changed nothing else: no shared state
  });
  it('axes of a theme reach tok() too', () => {
    expect(resolveAppTheme({ ...PURPLE, axes: { radius: 'square' } }, DISPLAY_DEFAULT).tok('radius-card' as TokenName)).toBe('0px');
  });
});

describe('library validation (doc.THEMES, theme files)', () => {
  it('parseTheme keeps known colours and axis values only, and reports the rest', () => {
    const notes: string[] = [];
    const t = parseTheme({ name: ' <b>Mine</b> ', colours: { primary: '#ABC', bogus: '#fff', ink: 'red' }, axes: { radius: 'round', density: 'huge', nope: 1 }, __proto__x: 1 }, notes);
    expect(t).toEqual({ name: 'b Mine /b', colours: { primary: '#aabbcc' }, axes: { radius: 'round' } });
    expect(notes).toHaveLength(5);
  });
  it('stored themes: built-in or duplicate sequence ids are dropped; the active id falls back to 1', () => {
    const d = { THEMES: [{ seq: 3, name: 'x', colours: {}, axes: {} }, { seq: 120, name: 'A', colours: {}, axes: {} }, { seq: 120, name: 'B', colours: {}, axes: {} }], ACTIVE_THEME: 999 };
    expect(userThemes(d).map((t) => `${t.seq} ${t.name}`)).toEqual(['120 A']);
    expect(activeSeq(d)).toBe(1);
    expect(activeTheme({ ACTIVE_THEME: 7 }).name).toBe('Purple');
    expect(nextSeq({ ...d, THEME_SEQ: 130 })).toBe(131);
    expect(nextSeq({})).toBe(100);
    expect(uniqueName({}, 'Purple')).toBe('Purple 2');
  });
  it('a theme file round-trips; a bad one is refused with a reason', () => {
    const { themes, notes } = readThemeFile(themeFileJson([PURPLE]));
    expect(themes).toEqual([{ name: 'Purple', description: PURPLE.description, colours: PURPLE.colours, axes: {} }]);
    expect(notes).toEqual([]);
    expect(() => readThemeFile('{')).toThrow(ThemeFileError);
    expect(() => readThemeFile('{"_schema":"other","themes":[{}]}')).toThrow(/Unknown theme file version/);
    expect(() => readThemeFile('[1,2]')).toThrow(/No theme/);
    expect(() => readThemeFile('x'.repeat(300 * 1024))).toThrow(/too large/);
    expect(readThemeFile('{"name":"Solo","colours":{"primary":"#123456"},"script":"alert(1)"}').notes).toEqual(['Theme 1: key "script" ignored.']);
  });
});
