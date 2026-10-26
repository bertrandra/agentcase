import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addTheme, duplicateTheme, generatePalette, updateTheme } from '@/controllers/themes';
import { parseTheme, userThemes } from '@/domain/theme/library';
import { paletteFromSeed } from '@/domain/theme/palette';
import { readThemeFile, themeFileJson } from '@/domain/theme/themeFile';
import { paramsWorkbookBytes, readParamsWorkbook } from '@/store/persistence/excel/params';
import { fromSnapshot, toSnapshot } from '@/store/persistence/snapshot';
import type { Doc } from '@/store/types';
import { applyTo, ENV } from '../helpers/excelParams';
import { freshStore, snap } from './helpers';
import { THEME_DEFAULT } from '@/domain/theme';

/** `theme.generate` (docs/THEME.md §8.9): the whole palette and its settings in one undoable step; built-ins refused; the settings persist. */
const doc = (s: ReturnType<typeof freshStore>) => s.getState().doc;
const G = { seed: '#0b7a75', contrast: 60, harmony: 'triadic' } as const;
const golden = (): Doc => fromSnapshot(JSON.parse(readFileSync('fixtures/cases/golden.json', 'utf8')));

describe('theme.generate', () => {
  it('writes every colour and the settings as one step; one undo restores the previous colours', () => {
    const s = freshStore(() => 1000);
    addTheme('Client'); updateTheme(100, { colours: { primary: '#224488', 'header-start': '#112244' } });
    const before = userThemes(doc(s))[0]!.colours, steps = s.getState().history.undo.length;
    generatePalette(100, G);
    const t = userThemes(doc(s))[0]!;
    expect(t.colours).toEqual(paletteFromSeed(G.seed, G));
    expect(t.generator).toEqual(G);
    expect(s.getState().history.undo).toHaveLength(steps + 1);
    expect(s.getState().history.undo.at(-1)!.label).toBe('Generate palette from #0b7a75 (contrast 60)');
    s.undo();
    expect(userThemes(doc(s))[0]!.colours).toEqual(before);
    expect(userThemes(doc(s))[0]!.generator).toBeUndefined();
    s.redo();
    expect(userThemes(doc(s))[0]!.generator).toEqual(G);
  });
  it('a later colour edit fine-tunes the generated palette (the settings stay); a duplicate copies them', () => {
    const s = freshStore(() => 1000);
    addTheme('Client'); generatePalette(100, G); updateTheme(100, { colours: { ink: '#000000' } });
    expect(userThemes(doc(s))[0]!.colours.ink).toBe('#000000');
    expect(userThemes(doc(s))[0]!.generator).toEqual(G);
    duplicateTheme(100);
    expect(userThemes(doc(s))[1]!).toMatchObject({ name: 'Client copy', generator: G });
  });
  it('built-in themes are refused (no change, no step); invalid settings are ignored', () => {
    const s = freshStore(), before = snap(s);
    generatePalette(3, G);
    expect(snap(s)).toBe(before);
    expect(s.getState().history.undo).toHaveLength(0);
    addTheme('A');
    const after = snap(s);
    generatePalette(100, { seed: 'teal', contrast: 50, harmony: 'mono' });
    expect(snap(s)).toBe(after);
  });
});

describe('generator settings persistence', () => {
  const themed = (): Doc => { const s = freshStore(); s.load(golden()); addTheme('Gen'); generatePalette(100, G); return s.getState().doc; };
  it('the case JSON round-trips them', () => {
    const back = fromSnapshot(JSON.parse(JSON.stringify(toSnapshot(themed()))));
    expect(userThemes(back)[0]!.generator).toEqual(G);
  });
  it('the theme file round-trips them; a file without them still loads; a bad block is dropped with a note', () => {
    const t = userThemes(themed())[0]!, { themes, notes } = readThemeFile(themeFileJson([t]));
    expect(themes[0]!.generator).toEqual(G);
    expect(notes).toEqual([]);
    expect(readThemeFile(JSON.stringify({ themes: [{ name: 'Old', colours: { primary: '#123456' }, axes: {} }] })).themes[0])
      .toEqual({ name: 'Old', colours: { primary: '#123456' }, axes: {} });
    const n: string[] = [];
    expect(parseTheme({ name: 'X', colours: {}, axes: {}, generator: { seed: 'nope' } }, n)!.generator).toBeUndefined();
    expect(n).toEqual(['theme: palette generator settings ignored (no valid seed colour).']);
  });
  it('the Themes sheet of the parameters workbook round-trips them', async () => {
    const src = themed(), { patch, notes } = await readParamsWorkbook(await paramsWorkbookBytes(src, 'all', ENV, THEME_DEFAULT), golden(), ENV);
    expect(notes.filter((x) => x.startsWith('Themes'))).toEqual([]);
    expect(userThemes(applyTo(golden(), patch))[0]!).toMatchObject({ generator: G, colours: userThemes(src)[0]!.colours });
  });
});
