// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations } from '../../helpers/axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userThemes } from '@/domain/theme/library';
import { appStore } from '@/store/instance';
import BrandTheme from '@/ui/sections/configure/brand-theme';
import { brandThemeView } from '@/ui/sections/configure/brand-theme/selection';
import { freshStore } from '../../store/helpers';

/** 🎨 Brand & theme on the real store (docs/THEME.md §8.8): library actions, protected built-ins, live preview, share link, axe. */
const doc = () => appStore().getState().doc;
const library = () => within(screen.getByRole('region', { name: 'Theme library' }));
const preview = () => screen.getByTestId('theme-preview');
const pick = (name: RegExp) => fireEvent.click(library().getByRole('button', { name }));
beforeEach(() => { freshStore(); brandThemeView.setState({ selected: null, previewDark: false }); });
afterEach(cleanup);

describe('Brand & theme section', () => {
  it('lists the seven built-ins with their number and badges, Capgemini active', () => {
    render(<BrandTheme />);
    const items = library().getAllByRole('button', { pressed: false }).concat(library().getAllByRole('button', { pressed: true })).filter((b) => b.classList.contains('ac-bt-item'));
    expect(items).toHaveLength(7);
    expect(library().getByRole('button', { pressed: true }).textContent).toMatch(/^1 Capgemini.*Built-in.*Active/);
    expect(library().getByRole('button', { name: /4 Rainbow/ }).textContent).toContain('Diagnostic');
  });
  it('a built-in is read-only: "Duplicate to edit" makes an editable copy with the next number, selected', () => {
    render(<BrandTheme />);
    pick(/7 Purple/);
    expect(screen.getByRole('group', { name: /Colours of Purple/ }).closest('fieldset')!.disabled).toBe(true);
    expect((library().getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate to edit' }));
    expect(userThemes(doc()).map((t) => `${t.seq} ${t.name}`)).toEqual(['100 Purple copy']);
    expect(screen.getByRole('heading', { name: '100 · Purple copy' })).toBeTruthy();
    expect(screen.getByRole('group', { name: /Colours of Purple copy/ }).closest('fieldset')!.disabled).toBe(false);
  });
  it('editing a colour updates the case, the contrast badge and the live preview; Reset goes back; Ctrl+Z undoes', () => {
    render(<BrandTheme />);
    fireEvent.click(library().getByRole('button', { name: 'New theme' }));
    expect(preview().style.getPropertyValue('--ac-header-start')).toBe('var(--ac-primary-700)');
    fireEvent.change(screen.getByLabelText('Header start'), { target: { value: '#ffff00' } });
    expect(userThemes(doc())[0]!.colours['header-start']).toBe('#ffff00');
    expect(preview().style.getPropertyValue('--ac-header-start')).toBe('#ffff00');
    expect(screen.getAllByText(/header-text on header-start is 1\.\d\d:1, below 4\.5:1/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Header start' }));
    expect(userThemes(doc())[0]!.colours).toEqual({});
    act(() => { appStore().undo(); });
    expect(userThemes(doc())[0]!.colours['header-start']).toBe('#ffff00');
  });
  it('axes are edited from AXES; the preview carries them and its controls follow them', () => {
    render(<BrandTheme />);
    fireEvent.click(library().getByRole('button', { name: 'New theme' }));
    fireEvent.change(screen.getByLabelText('Yes / no'), { target: { value: 'switch' } });
    fireEvent.change(screen.getByLabelText('Corner radius'), { target: { value: 'round' } });
    expect(userThemes(doc())[0]!.axes).toEqual({ controlsBoolean: 'switch', radius: 'round' });
    expect(preview().getAttribute('data-ac-radius')).toBe('round');
    expect(within(preview()).getByRole('switch', { name: /Include regulatory artefacts/ })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-ac-controls-boolean')).toBeNull();   // the app keeps its own controls
  });
  it('activate, rename, delete (the active one falls back to Capgemini); the light / dark preview toggle', () => {
    render(<BrandTheme />);
    fireEvent.click(library().getByRole('button', { name: 'New theme' }));
    fireEvent.click(library().getByRole('button', { name: 'Activate' }));
    expect(doc().ACTIVE_THEME).toBe(100);
    const name = library().getByRole('textbox', { name: 'Name of theme 100' });
    fireEvent.change(name, { target: { value: 'Client' } }); fireEvent.blur(name);
    expect(userThemes(doc())[0]!.name).toBe('Client');
    const light = preview().style.getPropertyValue('--ac-bg');
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(preview().style.getPropertyValue('--ac-bg')).not.toBe(light);
    fireEvent.click(library().getByRole('button', { name: 'Delete' }));
    expect(userThemes(doc())).toEqual([]);
    expect(doc().ACTIVE_THEME).toBeUndefined();
  });
  it('shows the ?theme= link of the selected theme and copies it', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<BrandTheme />);
    pick(/5 Sepia/);
    expect(screen.getByTestId('theme-link').textContent).toBe('?theme=5');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy the link to theme 5' })); });
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/[?&]theme=5$/));
  });
  it('Rainbow shows its zone legend', () => {
    render(<BrandTheme />);
    pick(/4 Rainbow/);
    expect(screen.getByRole('heading', { name: /Diagnostic legend/ })).toBeTruthy();
    expect(screen.getByText('Header banner')).toBeTruthy();
  });
  it.each([false, true])('has no axe violation (preview dark: %s)', async (dark) => {
    brandThemeView.setState({ previewDark: dark });
    const { container } = render(<BrandTheme />);
    pick(/7 Purple/);
    expect(await axeViolations(container, { region: false })).toEqual([]);
  });
});
