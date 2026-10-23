// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setCustomerLogo, setLogoOptions } from '@/controllers/brand';
import { setCustomerName } from '@/controllers/persona';
import { activateTheme } from '@/controllers/themes';
import { tok } from '@/domain/theme';
import { appStore } from '@/store/instance';
import { App } from '@/ui/App';
import { setThemeOverride, themeParam, themeViewStore } from '@/ui/brand/themeView';
import { setDisplayPrefs } from '@/ui/display/store';
import { uiStore } from '@/ui/uiState';
import { freshStore, snap } from '../store/helpers';
import { PNG } from '../store/samples/themes';

/** The theme at run time (docs/THEME.md §8.2, §8.6, §8.7): inline colours on <html>, the ?theme= link, the header logo. */
const html = () => document.documentElement, prop = (n: string) => html().style.getPropertyValue(`--ac-${n}`);
beforeEach(() => { freshStore(); uiStore.setState({ activeSection: 'home', toast: '' }); setThemeOverride(null); });
afterEach(() => { cleanup(); setThemeOverride(null); setDisplayPrefs({ mode: 'light' }); act(() => activateTheme(1)); });

describe('applying the case theme', () => {
  it('the default theme writes nothing on <html> (pixel parity); another theme writes its colours and tok() follows', () => {
    render(<App />);
    expect(html().getAttribute('style')).toBeNull();
    act(() => activateTheme(7));
    expect(prop('header-start')).toBe('#5b2a9e');
    expect(tok('header-start')).toBe('#5b2a9e');
    act(() => setDisplayPrefs({ mode: 'dark' }));
    expect(prop('bg')).not.toBe('');
    expect(prop('header-start')).not.toBe('#5b2a9e');   // the dark header of the theme
    act(() => setDisplayPrefs({ mode: 'light' }));
    act(() => activateTheme(1));
    expect(html().getAttribute('style')).toBeNull();
    expect(tok('header-start')).toBe('#0058ab');
  });
});

describe('the ?theme= link', () => {
  it('parses the query', () => {
    expect([themeParam(''), themeParam('?theme=4'), themeParam('?theme=x'), themeParam('?a=1&theme=120')]).toEqual([null, 4, Number.NaN, 120]);
  });
  it('shows the theme without touching the case or its history; "Make it the case theme" adopts it, "Clear" drops it', () => {
    const before = snap(appStore());
    setThemeOverride(6);
    render(<App />);
    expect(prop('header-start')).toBe('#8b1a2b');
    expect(screen.getByText(/Viewing theme 6 · Dark red from the link/)).toBeTruthy();
    expect(snap(appStore())).toBe(before);
    expect(appStore().getState().history.undo).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Make it the case theme' }));
    expect(appStore().getState().doc.ACTIVE_THEME).toBe(6);
    expect(themeViewStore.getState().override).toBeNull();
    act(() => setThemeOverride(2));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(themeViewStore.getState().override).toBeNull();
    expect(prop('header-start')).toBe('#8b1a2b');   // back to the case theme
  });
  it('an unknown theme number is ignored with a message', () => {
    setThemeOverride(999);
    render(<App />);
    expect(uiStore.getState().toast).toMatch(/Theme 999 is not in this case's library/);
    expect(themeViewStore.getState().override).toBeNull();
    expect(html().getAttribute('style')).toBeNull();
  });
});

describe('the customer logo in the header', () => {
  it('sits next to the title with "<customer> logo" as alt text, on a white pill when asked, and hides for the presentation', () => {
    render(<App />);
    expect(document.querySelector('.ac-brand-logo')).toBeNull();
    expect(document.querySelector('.ac-top-id.has-logo')).toBeNull();
    act(() => { setCustomerName('Acme'); setCustomerLogo(PNG); });
    const img = screen.getByRole('img', { name: 'Acme logo' });
    expect(img.getAttribute('src')).toBe(PNG);
    expect(img.closest('.ac-top-id')!.className).toContain('has-logo');
    act(() => setLogoOptions({ backdrop: 'pill' }));
    expect(screen.getByRole('img', { name: 'Acme logo' }).dataset.backdrop).toBe('pill');
    act(() => setLogoOptions({ hidden: true }));
    expect(screen.queryByRole('img', { name: 'Acme logo' })).toBeNull();
  });
});
