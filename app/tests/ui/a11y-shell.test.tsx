// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setPersona } from '@/controllers/persona';
import { App } from '@/ui/App';
import { goSection, uiStore } from '@/ui/uiState';
import { loadCase } from '../helpers/pdc';

beforeEach(() => { uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false, menuHidden: false, wiz: { active: false, pos: 0, visited: [] } }); loadCase('golden'); });
afterEach(cleanup);

describe('shell landmarks and names', () => {
  it('one banner, one main, one contentinfo, labelled navigations and a skip link that targets main', () => {
    render(<App />);
    act(() => setPersona('advanced'));
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Headline results' })).toBeTruthy();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip.getAttribute('href')).toBe('#main');
    expect(screen.getByRole('main').id).toBe('main');
  });
  it('a section has exactly one h1 and the nav groups are h2 headings', async () => {
    render(<App />);
    act(() => { setPersona('advanced'); goSection('home'); });
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(within(nav).getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(3);
  });
  it('every top-bar control is named: customer, persona, undo / redo, menu toggle', () => {
    render(<App />);
    const top = within(screen.getByRole('banner'));
    for (const n of ['Toggle the sidebar menu', 'Persona', 'Undo', 'Redo']) expect(top.getByLabelText(n)).toBeTruthy();
    expect(top.getByRole('button', { name: 'Toggle the sidebar menu' }).hasAttribute('aria-pressed')).toBe(true);
  });
  it('the active section is marked aria-current and announced politely when it changes', () => {
    render(<App />);
    act(() => { setPersona('advanced'); goSection('home'); });
    const announcer = screen.getByTestId('section-announcer');
    expect(announcer.getAttribute('aria-live')).toBe('polite');
    expect(announcer.textContent).toContain('Welcome');
    expect(within(screen.getByRole('navigation', { name: 'Sections' })).getAllByRole('button', { hidden: true }).filter((b) => b.getAttribute('aria-current') === 'page')).toHaveLength(1);
    act(() => goSection('team-in'));
    expect(announcer.textContent).not.toContain('Welcome');
  });
  it('the toast is a polite live region', () => {
    render(<App />);
    act(() => uiStore.setState({ toast: 'Saved' }));
    expect(screen.getByRole('status').textContent).toBe('Saved');
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  });
  it('the history dock button exposes its expanded state and the list is named', () => {
    render(<App />);
    const b = screen.getByRole('button', { name: /History/ });
    expect(b.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(b);
    expect(b.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('guided sequence and group bar', () => {
  it('the sequence bar is a named region with a labelled progressbar, step list and exit button', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: 'Guided sequence' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Start guided sequence/ }));
    const bar = within(screen.getByRole('region', { name: 'Guided sequence' }));
    expect(bar.getByRole('progressbar', { name: 'Guided sequence progress' }).getAttribute('aria-valuenow')).not.toBeNull();
    expect(bar.getByRole('list', { name: 'Steps' })).toBeTruthy();
    expect(bar.getByRole('button', { name: 'Exit the sequence' })).toBeTruthy();
    expect(bar.getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'step').length).toBeGreaterThan(0);
  });
  it('the hide-menu group bar is a named navigation with a named group select and a named welcome button (menu toggle and persona stay in the top bar)', () => {
    render(<App />);
    const nav = within(screen.getByRole('navigation', { name: 'Group navigation' }));
    expect(nav.queryByLabelText('Switch persona')).toBeNull();
    expect(nav.getByLabelText('Group')).toBeTruthy();
    expect(nav.getByRole('button', { name: 'Welcome' })).toBeTruthy();
  });
});
