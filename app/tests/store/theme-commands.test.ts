import { describe, expect, it } from 'vitest';
import { clearCustomerLogo, setCustomerLogo, setLogoOptions } from '@/controllers/brand';
import { activateTheme, addTheme, deleteTheme, duplicateTheme, importThemes, renameTheme, updateTheme } from '@/controllers/themes';
import { BUILTIN_THEMES } from '@/domain/theme/catalogue';
import { activeSeq, userThemes } from '@/domain/theme/library';
import { logoOf } from '@/domain/theme/logo';
import { freshStore, snap } from './helpers';
import { PNG } from './samples/themes';

/** The theme library commands (docs/THEME.md §8.4): built-ins protected, sequence ids never reused, the active theme falls back to 1. */
const doc = (s: ReturnType<typeof freshStore>) => s.getState().doc;
const seqs = (s: ReturnType<typeof freshStore>) => userThemes(doc(s)).map((t) => t.seq);

describe('theme library commands', () => {
  it('a new theme starts from the default look with the next sequence id (100 up); a duplicate copies colours and axes', () => {
    const s = freshStore();
    addTheme('Mine'); duplicateTheme(7);
    expect(userThemes(doc(s)).map((t) => [t.seq, t.name, Object.keys(t.colours).length > 0])).toEqual([[100, 'Mine', false], [101, 'Purple copy', true]]);
    expect(userThemes(doc(s))[1]!.colours).toEqual(BUILTIN_THEMES[6]!.colours);
  });
  it('built-in themes cannot be renamed, updated or deleted', () => {
    const s = freshStore(), before = snap(s);
    renameTheme(2, 'Hack'); updateTheme(2, { colours: { primary: '#000000' } }); deleteTheme(1); deleteTheme(4);
    expect(snap(s)).toBe(before);
    expect(s.getState().history.undo).toHaveLength(0);   // a no-op command records no step
  });
  it('a deleted theme\'s sequence id is never reused (THEME_SEQ keeps the last one issued)', () => {
    const s = freshStore();
    addTheme('A'); addTheme('B'); deleteTheme(101); addTheme('C');
    expect(seqs(s)).toEqual([100, 102]);
    deleteTheme(102); deleteTheme(100); addTheme('D');
    expect(seqs(s)).toEqual([103]);
  });
  it('deleting the active theme falls back to the default (1); activating 1 stores nothing', () => {
    const s = freshStore();
    addTheme('A'); activateTheme(100);
    expect(activeSeq(doc(s))).toBe(100);
    deleteTheme(100);
    expect(activeSeq(doc(s))).toBe(1);
    expect('ACTIVE_THEME' in doc(s)).toBe(false);
    s.undo();
    expect(activeSeq(doc(s))).toBe(100);
    activateTheme(1);
    expect('ACTIVE_THEME' in doc(s)).toBe(false);
    activateTheme(555);   // unknown: ignored
    expect(activeSeq(doc(s))).toBe(1);
  });
  it('update sets and resets overrides, keeps only valid values, and successive edits of one control coalesce into one step', () => {
    const s = freshStore(() => 1000);
    addTheme('A');
    const steps = s.getState().history.undo.length;
    for (const c of ['#111111', '#222222', '#333333']) updateTheme(100, { colours: { primary: c } });
    updateTheme(100, { colours: { ink: 'red' }, axes: { radius: 'round', density: 'huge' as never } });
    expect(userThemes(doc(s))[0]!.colours).toEqual({ primary: '#333333' });
    expect(userThemes(doc(s))[0]!.axes).toEqual({ radius: 'round' });
    expect(s.getState().history.undo.length).toBe(steps + 2);
    updateTheme(100, { colours: { primary: null }, axes: { radius: 'soft' } });   // back to the default: no override stored
    expect(userThemes(doc(s))[0]!).toMatchObject({ colours: {}, axes: {} });
  });
  it('import appends validated themes with fresh ids and unique names', () => {
    const s = freshStore();
    importThemes([{ name: 'Purple', colours: { primary: '#123456' }, axes: {} }, { name: 'Purple', colours: {}, axes: {} }]);
    expect(userThemes(doc(s)).map((t) => `${t.seq} ${t.name}`)).toEqual(['100 Purple 2', '101 Purple 3']);
  });
  it('the customer logo: set (PNG / JPEG data URL only), options, clear; each undoable', () => {
    const s = freshStore();
    setCustomerLogo('data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Lz48L3N2Zz4=');   // markup is never stored
    setCustomerLogo('javascript:alert(1)');
    expect(doc(s).CUSTOMER_LOGO).toBeUndefined();
    setCustomerLogo(PNG); setLogoOptions({ backdrop: 'pill' }); setLogoOptions({ hidden: true });
    expect(logoOf(doc(s))).toEqual({ src: PNG, backdrop: 'pill', hidden: true });
    clearCustomerLogo();
    expect(doc(s).CUSTOMER_LOGO).toBeUndefined();
    s.undo(); s.undo();
    expect(logoOf(doc(s))).toEqual({ src: PNG, backdrop: 'pill', hidden: false });
  });
});
