// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootApp, dismissRestore } from '@/controllers/boot';
import { setCustomerName } from '@/controllers/persona';
import { createAppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';
import { memoryStorage, startAutosave } from '@/store/persistence/autosave';
import { rescueFocus } from '@/ui/focusRescue';
import { App } from '@/ui/App';
import { uiStore } from '@/ui/uiState';
import { loadCase } from '../helpers/pdc';

beforeEach(() => { uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false, menuHidden: false, wiz: { active: false, pos: 0, visited: [] } }); loadCase('golden'); });
afterEach(() => { cleanup(); dismissRestore(); document.body.innerHTML = ''; });
const bar = () => within(screen.getByRole('region', { name: 'Guided sequence' }));
const focused = () => document.activeElement as HTMLElement;

describe('rescueFocus', () => {
  it('moves focus to the target when focus fell to the body, and leaves it alone when the user already went elsewhere', async () => {
    document.body.innerHTML = '<button id="a">a</button><button id="b">b</button>';
    rescueFocus(() => document.getElementById('a'));
    await waitFor(() => expect(focused().id).toBe('a'));
    document.getElementById('b')!.focus();
    rescueFocus(() => document.getElementById('a'));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(focused().id).toBe('b');
  });
  it('does nothing when there is no target', async () => {
    rescueFocus(() => null);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(focused()).toBe(document.body);
  });
});

describe('focus does not fall to the page body when the focused control unmounts', () => {
  it('Start guided sequence puts focus on the step bar, Exit returns it to the Start button', async () => {
    render(<App />);
    const start = screen.getByRole('button', { name: /Start guided sequence/ });
    start.focus(); fireEvent.click(start);
    await waitFor(() => expect(bar().getByRole('button', { name: 'Next →' })).toBe(focused()));
    fireEvent.click(bar().getByRole('button', { name: 'Exit the sequence' }));
    await waitFor(() => expect(focused()).toBe(screen.getByRole('button', { name: /Start guided sequence/ })));
  });
  it('Finish on the last stop also returns focus', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Start guided sequence/ }));
    await waitFor(() => bar().getByRole('button', { name: 'Next →' }));
    for (let i = 0; i < 200 && !bar().queryByRole('button', { name: /Finish/ }); i++) fireEvent.click(bar().getByRole('button', { name: 'Next →' }));
    const finish = bar().getByRole('button', { name: /Finish/ });
    finish.focus(); fireEvent.click(finish);
    await waitFor(() => expect(focused()).toBe(screen.getByRole('button', { name: /Start guided sequence/ })));
  });
  it('the top-bar ☰ toggle shows the sidebar and keeps focus on the toggle', async () => {
    act(() => uiStore.setState({ menuHidden: true }));
    render(<App />);
    expect(within(screen.getByRole('navigation', { name: 'Group navigation' })).queryByRole('button', { name: /Menu/ })).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Toggle the sidebar menu' });
    toggle.focus(); fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy());
    expect(focused()).toBe(toggle);
  });
  it.each(['Restore', 'Dismiss'])('the restore banner %s hands focus to the main region', async (name) => {
    const storage = memoryStorage(), old = createAppStore(makeDefaultDoc(), { now: () => 0 });
    setAppStore(old); setCustomerName('Previous session');
    await startAutosave(old, storage, 'old-tab').flush();
    loadCase('golden');
    const stop = await bootApp({ storage, channel: null, tabId: 'new-tab' });
    render(<App />);
    const b = screen.getByRole('button', { name });
    b.focus(); await act(async () => { fireEvent.click(b); });
    await waitFor(() => expect(focused()).toBe(screen.getByRole('main')));
    stop();
  });
});
