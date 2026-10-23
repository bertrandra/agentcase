// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ChartConfiguration } from 'chart.js';
import { afterEach, describe, expect, it } from 'vitest';
import { argb, printTok, tok } from '../../src/domain/theme';
import { DISPLAY_DEFAULT } from '../../src/domain/theme/modes';
import { buildSnapshotHtml } from '../../src/store/persistence/html/embed';
import { DisplayMenu } from '../../src/ui/display/DisplayMenu';
import { parsePrefs, PREFS_DEFAULT, PREFS_KEY, resolveDisplay } from '../../src/ui/display/prefs';
import { displayStore, initDisplay, setDisplayPrefs } from '../../src/ui/display/store';
import { contrast, textColor } from '../../src/ui/colorText';
import { themedConfig } from '../../src/ui/widgets/chartTheme';

/** The viewer's display preference (docs/THEME.md §6.5): stored per browser, resolved against the system, applied to the CSS and to tok(). */
const NO_SYS = { dark: false, contrastMore: false, reducedMotion: false };
afterEach(() => { cleanup(); act(() => setDisplayPrefs({ ...PREFS_DEFAULT })); localStorage.removeItem(PREFS_KEY); });

describe('display preference', () => {
  it('reads back safely: missing, malformed or unknown values give the defaults (light, standard)', () => {
    expect(parsePrefs(null)).toEqual(PREFS_DEFAULT);
    expect(parsePrefs('{oops')).toEqual(PREFS_DEFAULT);
    expect(parsePrefs('[1]')).toEqual(PREFS_DEFAULT);
    expect(parsePrefs(JSON.stringify({ mode: 'sepia', contrast: 'max', cvd: 'yes', reduceMotion: true }))).toEqual({ ...PREFS_DEFAULT, reduceMotion: true });
    expect(parsePrefs(JSON.stringify({ mode: 'auto', contrast: 'high', cvd: true }))).toEqual({ mode: 'auto', contrast: 'high', cvd: true, reduceMotion: false });
  });
  it('auto follows the system scheme, and "more contrast" lifts standard to enhanced; explicit choices win', () => {
    const auto = { ...PREFS_DEFAULT, mode: 'auto' as const };
    expect(resolveDisplay(auto, NO_SYS)).toEqual(DISPLAY_DEFAULT);
    expect(resolveDisplay(auto, { dark: true, contrastMore: true, reducedMotion: true })).toEqual({ mode: 'dark', contrast: 'enhanced', cvd: false, reduceMotion: true });
    expect(resolveDisplay({ ...PREFS_DEFAULT, mode: 'light' }, { dark: true, contrastMore: true, reducedMotion: false })).toEqual(DISPLAY_DEFAULT);
  });
  it('applies to <html> and tok(), saves to localStorage, bumps the version; the exports stay light', () => {
    const root = document.documentElement, v = displayStore.getState().version, light = tok('surface');
    act(() => setDisplayPrefs({ mode: 'dark', contrast: 'high', cvd: true, reduceMotion: true }));
    expect([root.dataset.acMode, root.dataset.acContrast, root.dataset.acCvd, root.dataset.acMotion]).toEqual(['dark', 'high', 'on', 'reduce']);
    expect(tok('surface')).not.toBe(light);
    expect(tok('duration-fast')).toBe('0s');
    expect(displayStore.getState().version).toBe(v + 1);
    expect(JSON.parse(localStorage.getItem(PREFS_KEY)!)).toMatchObject({ mode: 'dark', contrast: 'high' });
    expect([printTok('report-ink'), argb('excel-head-bg')]).toEqual(['#22262e', 'FF1E2761']);
    act(() => setDisplayPrefs({ ...PREFS_DEFAULT }));
    expect(['data-ac-mode', 'data-ac-contrast', 'data-ac-cvd', 'data-ac-motion'].map((a) => root.hasAttribute(a))).toEqual([false, false, false, false]);
    expect(tok('surface')).toBe(light);
  });
  it('initDisplay reads the stored preference and survives a missing matchMedia', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ mode: 'dark' }));
    act(() => initDisplay({} as Window));
    expect(document.documentElement.dataset.acMode).toBe('dark');
  });
  it('textColor lightens a data colour on a dark surface, darkens it on a light one', () => {
    expect(contrast(textColor('#3a5a8f'), tok('neutral-0'))).toBeGreaterThanOrEqual(4.5);
    act(() => setDisplayPrefs({ mode: 'dark' }));
    const out = textColor('#3a5a8f');
    expect(contrast(out, tok('neutral-0'))).toBeGreaterThanOrEqual(4.5);
    expect(parseInt(out.slice(1, 3), 16)).toBeGreaterThan(0x3a);
  });
  it('the HTML snapshot does not carry the author\'s display', () => {
    act(() => setDisplayPrefs({ mode: 'dark', contrast: 'enhanced' }));
    const html = buildSnapshotHtml(document.documentElement, {});
    expect(html).not.toMatch(/data-ac-(mode|contrast)/);
  });
});

describe('Display control of the top bar', () => {
  it('discloses native radios / checkboxes, applies a choice, closes on Escape with focus back on the button', () => {
    render(<DisplayMenu />);
    const btn = screen.getByRole('button', { name: 'Display settings' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const group = screen.getByRole('group', { name: 'Display settings' });
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(displayStore.getState().spec.mode).toBe('dark');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colour-blind safe charts' }));
    expect(displayStore.getState().prefs.cvd).toBe(true);
    expect(screen.getByRole('radio', { name: 'High' })).toBeTruthy();
    fireEvent.keyDown(group, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Display settings' })).toBeNull();
    expect(document.activeElement).toBe(btn);
  });
});

describe('charts under the display options', () => {
  const cfg = { type: 'line', data: { labels: ['a'], datasets: [{ label: 'A', data: [1] }, { label: 'B', data: [2] }, { type: 'bar', label: 'C', data: [3], backgroundColor: '#123456' }] } } as unknown as ChartConfiguration;
  it('colour-blind: dash + point style per line series; reduced motion: no animation; default: the config untouched', () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];   // jsdom: no 2D canvas
    expect(themedConfig(cfg, DISPLAY_DEFAULT)).toBe(cfg);
    const out = themedConfig(cfg, { ...DISPLAY_DEFAULT, cvd: true, reduceMotion: true }), ds = out.data.datasets as unknown as Record<string, unknown>[];
    expect(ds.map((d) => d.pointStyle)).toEqual(['circle', 'rect', undefined]);
    expect(ds[1]!.borderDash).toEqual([6, 3]);
    expect(ds[2]!.backgroundColor).toBe('#123456');   // jsdom has no 2D canvas: the hatch falls back to the plain colour
    expect(out.options?.animation).toBe(false);
  });
});
