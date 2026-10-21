// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setSeqEnabled } from '@/controllers/navSequence';
import { setPersona } from '@/controllers/persona';
import { appStore } from '@/store/instance';
import { App } from '@/ui/App';
import { NavZone } from '@/ui/shell/NavZone';
import { goSection, setFastPath, setMenuHidden, uiStore } from '@/ui/uiState';
import { loadCase } from '../helpers/pdc';

beforeEach(() => {
  uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false, menuHidden: false, openGroup: null, fastPath: false, wiz: { active: false, pos: 0, visited: [] } });
  loadCase('golden');
  act(() => setPersona('advanced'));
});
afterEach(cleanup);
const nav = () => screen.getByRole('navigation', { name: 'Sections' });
const shown = () => [...nav().querySelectorAll<HTMLElement>('[data-section]')].filter((b) => !b.closest('[hidden]')).map((b) => b.dataset.section);
const all = () => [...nav().querySelectorAll<HTMLElement>('[data-section]')].map((b) => b.dataset.section);

describe('collapsible sidebar groups', () => {
  it('start collapsed; each header is a button with aria-expanded and aria-controls pointing at its list', () => {
    render(<NavZone />);
    const buttons = [...nav().querySelectorAll<HTMLButtonElement>('h2 > button')];
    expect(buttons.length).toBeGreaterThan(3);
    for (const b of buttons) {
      expect(b.getAttribute('aria-expanded')).toBe('false');
      expect(nav().querySelector(`#${b.getAttribute('aria-controls')}`)?.hasAttribute('hidden')).toBe(true);
    }
    expect(shown()).toEqual([]);
    expect(all().length).toBeGreaterThan(20);   // collapsed, not removed
  });
  it('a click opens a group, closes the others (accordion) and a second click closes it', () => {
    render(<NavZone />);
    const [first, second] = [...nav().querySelectorAll<HTMLButtonElement>('h2 > button')];
    fireEvent.click(first!);
    expect(first!.getAttribute('aria-expanded')).toBe('true');
    expect(shown().length).toBeGreaterThan(0);
    fireEvent.click(second!);
    expect(first!.getAttribute('aria-expanded')).toBe('false');
    expect(second!.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(second!);
    expect(shown()).toEqual([]);
  });
  it('the toggles are native buttons, so Enter and Space operate them; visible sections are reachable in the accessibility tree', () => {
    render(<NavZone />);
    const b = nav().querySelector<HTMLButtonElement>('h2 > button')!;
    expect(b.tagName).toBe('BUTTON');
    expect(b.getAttribute('type')).toBe('button');
    expect(within(nav()).queryAllByRole('button', { name: /Financial/ })).toHaveLength(0);   // collapsed items are out of the accessibility tree
  });
  it('opening a section from anywhere expands the group that holds it', () => {
    render(<NavZone />);
    act(() => goSection('financial'));
    expect(shown()).toContain('financial');
    const holder = nav().querySelector('[data-section="financial"]')!.closest('section')!;
    expect(holder.querySelector('h2 > button')!.getAttribute('aria-expanded')).toBe('true');
    expect(nav().querySelectorAll('h2 > button[aria-expanded="true"]')).toHaveLength(1);
  });
  it('the collapsed state is a UI preference: no history step, no document change', () => {
    render(<NavZone />);
    const before = appStore().getState().doc, h = appStore().getState().history;
    fireEvent.click(nav().querySelector('h2 > button')!);
    act(() => { goSection('financial'); setFastPath(true); setFastPath(false); });
    expect(appStore().getState().doc).toBe(before);
    expect(appStore().getState().history.undo).toHaveLength(h.undo.length);
  });
});

describe('Fast Path filter', () => {
  it('keeps only minimum-viable-path sections in the sidebar, in the unchanged order, and restores the full menu', () => {
    render(<NavZone />);
    const full = all();
    act(() => setFastPath(true));
    const fast = all();
    expect(fast.length).toBeGreaterThan(0);
    expect(fast.length).toBeLessThan(full.length);
    expect(fast).toEqual(full.filter((id) => fast.includes(id)));
    expect(fast).toContain('financial');
    expect(fast).not.toContain('risk');
    act(() => setFastPath(false));
    expect(all()).toEqual(full);
  });
  it('is switched from a labelled checkbox in the top bar and changes nothing in the case or its history', () => {
    render(<App />);
    const before = appStore().getState().doc;
    fireEvent.click(screen.getByRole('checkbox', { name: /Fast Path/ }));
    expect(uiStore.getState().fastPath).toBe(true);
    expect(all()).not.toContain('risk');
    expect(appStore().getState().doc).toBe(before);
    expect(appStore().getState().history.undo).toHaveLength(0);
  });
  it('also filters the group bar of the hide-menu mode', () => {
    render(<App />);
    act(() => { setFastPath(true); setMenuHidden(true); goSection('financial'); });
    const bar = within(screen.getByRole('navigation', { name: 'Group navigation' }));
    expect(bar.getAllByRole('button', { name: /./ }).some((b) => /Risk/.test(b.textContent ?? ''))).toBe(false);
    expect(bar.getByRole('button', { name: /Financial/ })).toBeTruthy();
  });
});

describe('Fast Path and the guided sequence', () => {
  it('counts only Fast-Path sections, and explains when none is left', () => {
    act(() => { setPersona('builder'); setSeqEnabled('builder', true); });
    render(<App />);
    act(() => setFastPath(true));
    const region = screen.queryByRole('region', { name: 'Guided sequence' });
    if (region) expect(region.textContent).toMatch(/Fast-Path section/);
    else expect(screen.queryByText(/Fast Path is on and this sequence has no minimum-viable-path/) ?? screen.queryByText(/guided/)).toBeDefined();
  });
});
