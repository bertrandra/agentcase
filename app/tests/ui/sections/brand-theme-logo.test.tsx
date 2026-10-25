// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCustomerLogo, setCustomerLogo } from '@/controllers/brand';
import { userThemes } from '@/domain/theme/library';
import { paletteFromSeed } from '@/domain/theme/palette';
import { appStore } from '@/store/instance';
import BrandTheme from '@/ui/sections/configure/brand-theme';
import { brandThemeView } from '@/ui/sections/configure/brand-theme/selection';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';
import { PNG } from '../../store/samples/themes';

/** jsdom has no canvas: the adapter is stubbed with synthetic pixels (white background, a blue and an orange area). */
const read = vi.hoisted(() => vi.fn());
vi.mock('@/ui/brand/logoPixels', () => ({ readLogoPixels: read }));
const run = (rgba: number[], n: number): number[] => Array.from({ length: n }, () => rgba).flat();
const LOGO = { data: new Uint8ClampedArray([...run([255, 255, 255, 255], 500), ...run([0, 112, 173, 255], 300), ...run([230, 120, 20, 255], 100)]),
  width: 30, height: 30 };

const doc = () => appStore().getState().doc;
const panel = () => within(screen.getByRole('region', { name: 'Generate from one colour' }));
const newTheme = () => { render(<BrandTheme />); fireEvent.click(screen.getByRole('button', { name: 'New theme' })); };
beforeEach(() => { freshStore(() => 1000); brandThemeView.setState({ selected: null, previewDark: false, draft: null }); read.mockReset(); });
afterEach(cleanup);

describe('Palette from logo (docs/THEME.md §8.10)', () => {
  it('is offered only when the case has a customer logo', () => {
    newTheme();
    expect(panel().queryByRole('button', { name: /Palette from logo/ })).toBeNull();
    act(() => setCustomerLogo(PNG));
    expect(panel().getByRole('button', { name: /Palette from logo/ })).toBeTruthy();
    act(() => clearCustomerLogo());
    expect(panel().queryByRole('button', { name: /Palette from logo/ })).toBeNull();
  });
  it('applies the palette of the dominant logo colour with the panel contrast as one undoable step; another colour found can be used', async () => {
    act(() => setCustomerLogo(PNG));
    newTheme();
    read.mockResolvedValue(LOGO);
    fireEvent.change(panel().getByRole('slider', { name: 'Palette contrast' }), { target: { value: '70' } });
    const steps = appStore().getState().history.undo.length;
    fireEvent.click(panel().getByRole('button', { name: /Palette from logo/ }));
    await waitFor(() => expect(userThemes(doc())[0]!.generator?.seed).toBe('#0070ad'));
    expect(read).toHaveBeenCalledWith(PNG);   // the stored data URL: nothing fetched
    expect(userThemes(doc())[0]!.colours).toEqual(paletteFromSeed('#0070ad', { contrast: 70 }));
    expect(appStore().getState().history.undo).toHaveLength(steps + 1);
    expect(screen.getByText(/Palette generated from the logo colour #0070ad \(contrast 70\)/)).toBeTruthy();
    const found = within(panel().getByRole('list', { name: 'Colours found in the logo' }));
    expect(found.getByRole('button', { name: /#0070ad \(75 %/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(found.getByRole('button', { name: /#e67814 \(25 %/ }));
    expect(userThemes(doc())[0]!.generator?.seed).toBe('#e67814');
    act(() => { appStore().undo(); appStore().undo(); });
    expect(userThemes(doc())[0]!.colours).toEqual({});
    expect(userThemes(doc())[0]!.generator).toBeUndefined();
    expect(await axeViolations(document.body, { region: false })).toEqual([]);   // a section rendered alone, outside the page landmarks
  });
  it('a logo without a distinct colour, or that cannot be read, changes nothing and says why', async () => {
    act(() => setCustomerLogo(PNG));
    newTheme();
    const steps = appStore().getState().history.undo.length;
    read.mockResolvedValue({ data: new Uint8ClampedArray(run([20, 20, 20, 255], 50)), width: 5, height: 10 });
    fireEvent.click(panel().getByRole('button', { name: /Palette from logo/ }));
    await waitFor(() => expect(screen.getByText(/No distinct colour in the logo/)).toBeTruthy());
    read.mockRejectedValue(new Error('broken'));
    fireEvent.click(panel().getByRole('button', { name: /Palette from logo/ }));
    await waitFor(() => expect(screen.getByText(/The logo could not be read/)).toBeTruthy());
    expect(appStore().getState().history.undo).toHaveLength(steps);
    expect(userThemes(doc())[0]!.colours).toEqual({});
  });
});
