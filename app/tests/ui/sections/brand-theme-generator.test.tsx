// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations } from '../../helpers/axe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { userThemes } from '@/domain/theme/library';
import { paletteFromSeed } from '@/domain/theme/palette';
import { appStore } from '@/store/instance';
import BrandTheme from '@/ui/sections/configure/brand-theme';
import { brandThemeView } from '@/ui/sections/configure/brand-theme/selection';
import { freshStore } from '../../store/helpers';

/** "Generate from one colour" in the Brand & theme editor (docs/THEME.md §8.9), on the real store: preview-only drafts, one-step Apply, undo, axe. */
const doc = () => appStore().getState().doc;
const library = () => within(screen.getByRole('region', { name: 'Theme library' }));
const panel = () => within(screen.getByRole('region', { name: 'Generate from one colour' }));
const preview = () => screen.getByTestId('theme-preview');
const pv = (n: string) => preview().style.getPropertyValue(`--ac-${n}`);
const newTheme = () => { render(<BrandTheme />); fireEvent.click(library().getByRole('button', { name: 'New theme' })); };
beforeEach(() => { freshStore(() => 1000); brandThemeView.setState({ selected: null, previewDark: false, draft: null }); });
afterEach(cleanup);

describe('palette generator panel', () => {
  it('is shown for a user theme only: a built-in keeps "Duplicate to edit"', () => {
    render(<BrandTheme />);
    library().getByRole('button', { name: /7 Purple/ }).click();
    expect(screen.queryByRole('region', { name: 'Generate from one colour' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Duplicate to edit' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate to edit' }));
    expect(screen.getByRole('region', { name: 'Generate from one colour' })).toBeTruthy();
  });
  it('starts from the theme primary; seed, slider and harmony update the swatches and the preview only', () => {
    newTheme();
    expect((panel().getByLabelText('Seed colour') as HTMLInputElement).value).toBe('#0058ab');
    const slider = panel().getByRole('slider', { name: 'Palette contrast' });
    expect(slider.getAttribute('aria-valuetext')).toBe('50, Balanced');
    fireEvent.change(panel().getByLabelText('Seed colour'), { target: { value: '#0b7a75' } });
    fireEvent.change(slider, { target: { value: '100' } });
    expect(slider.getAttribute('aria-valuetext')).toBe('100, Strong');
    const strong = paletteFromSeed('#0b7a75', { contrast: 100 });
    expect(pv('header-start')).toBe(strong['header-start']);
    expect(panel().getByText(strong['chart-cat-3'])).toBeTruthy();
    expect(panel().getByText('Series 3')).toBeTruthy();
    fireEvent.change(slider, { target: { value: '0' } });
    expect(pv('header-start')).toBe(paletteFromSeed('#0b7a75', { contrast: 0 })['header-start']);
    fireEvent.click(panel().getByRole('radio', { name: 'Triadic' }));
    expect(pv('chart-cat-2')).toBe(paletteFromSeed('#0b7a75', { contrast: 0, harmony: 'triadic' })['chart-cat-2']);
    expect(userThemes(doc())[0]!.colours).toEqual({});   // nothing written yet
    fireEvent.click(panel().getByRole('button', { name: 'Discard preview' }));
    expect(pv('header-start')).toBe('var(--ac-primary-700)');
  });
  it('Apply writes the palette as one history step; Ctrl+Z restores every previous colour; the pickers stay editable', () => {
    newTheme();
    fireEvent.change(screen.getByLabelText('Header start'), { target: { value: '#112244' } });
    const steps = appStore().getState().history.undo.length;
    fireEvent.change(panel().getByLabelText('Seed colour'), { target: { value: '#0b7a75' } });
    fireEvent.change(panel().getByRole('slider', { name: 'Palette contrast' }), { target: { value: '60' } });
    fireEvent.click(panel().getByRole('button', { name: 'Apply to theme' }));
    expect(appStore().getState().history.undo).toHaveLength(steps + 1);
    expect(userThemes(doc())[0]!.colours).toEqual(paletteFromSeed('#0b7a75', { contrast: 60 }));
    expect(userThemes(doc())[0]!.generator).toEqual({ seed: '#0b7a75', contrast: 60, harmony: 'analogous' });
    expect(panel().getByText(/Last applied: #0b7a75, contrast 60, Analogous/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Ink'), { target: { value: '#000000' } });
    expect(userThemes(doc())[0]!.colours.ink).toBe('#000000');
    act(() => { appStore().undo(); appStore().undo(); });
    expect(userThemes(doc())[0]!.colours).toEqual({ 'header-start': '#112244' });
    expect((panel().getByLabelText('Seed colour') as HTMLInputElement).value).toBe('#0058ab');
  });
  it('the harmony is a keyboard radio group with a legend', () => {
    newTheme();
    const group = panel().getByRole('group', { name: 'Harmony' });
    expect(within(group).getAllByRole('radio').map((r) => (r as HTMLInputElement).labels![0]!.textContent!.trim()))
      .toEqual(['Monochrome', 'Analogous', 'Complementary', 'Triadic']);
    expect((within(group).getByRole('radio', { name: 'Analogous' }) as HTMLInputElement).checked).toBe(true);
  });
  it.each([false, true])('has no axe violation with the panel (preview dark: %s)', async (dark) => {
    brandThemeView.setState({ previewDark: dark });
    newTheme();
    fireEvent.change(panel().getByLabelText('Seed colour'), { target: { value: '#0b7a75' } });
    expect(await axeViolations(document.body, { region: false })).toEqual([]);
  });
});
