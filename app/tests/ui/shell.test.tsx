// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setAgentSup, setPhaseAgent } from '@/controllers/artefacts';
import { setCustomerName } from '@/controllers/frame';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import { App } from '@/ui/App';
import { openGroup, uiStore } from '@/ui/uiState';
import { APP_SECTIONS, LEGACY_SECTIONS, visibleSections } from '@/ui/zones/registry';
import { shouldHandle } from '@/ui/shell/useShortcuts';
import { freshStore } from '../store/helpers';

beforeEach(() => { freshStore(); uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false }); });
afterEach(cleanup);
/** The default persona opens with the sidebar hidden (its "hide menu" flag): bring the full menu back, as the user does with the ☰ toggle of the top bar. */
const openMenu = () => {
  const b = screen.queryByRole('button', { name: 'Toggle the sidebar menu' });
  if (b?.getAttribute('aria-pressed') === 'false') fireEvent.click(b);
};
const kpi = (label: string) => screen.getByText(label).parentElement!.querySelector('.ac-kpi-v')!.textContent;

describe('shell zones', () => {
  it('renders the five zones with landmarks', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Group navigation' })).toBeTruthy();
    openMenu();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByLabelText('Headline results')).toBeTruthy();
    expect(screen.getByText(/History \(0\)/)).toBeTruthy();
  });
  it('the nav lists exactly the sections of the persona, grouped', () => {
    render(<App />);
    openMenu();
    const nav = screen.getByRole('navigation', { name: 'Sections' }), items = () => nav.querySelectorAll('[data-section]');
    expect(items()).toHaveLength(visibleSections('builder').length + 2);   // + the app sections Brand & theme and Process (BPMN)
    act(() => { fireEvent.change(screen.getByLabelText('Persona'), { target: { value: 'advanced' } }); });
    // one product: the 5 Portfolio sections are not in the menu (84 in the catalogue)
    expect(items()).toHaveLength(LEGACY_SECTIONS.length + APP_SECTIONS.length);
    expect(within(nav).getAllByRole('heading').length).toBeGreaterThan(8);
  });
  it('persona changes are not undoable; navigation opens the section placeholder', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Persona'), { target: { value: 'clientcase' } });
    expect(appStore().getState().history.undo).toHaveLength(0);
    openMenu();
    act(() => openGroup('scope'));
    fireEvent.click(screen.getByRole('button', { name: /^🎯 Scope$/ }));
    // migrated section (lazy)
    expect((await screen.findByRole('heading', { level: 1, name: 'Scope — target artifact selection' }, { timeout: 8000 }))).toBeTruthy();
    act(() => openGroup('frame'));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Sections' })).getByRole('button', { name: /Welcome/ }));
    expect(screen.getByRole('main').querySelector('h1')!.textContent).toMatch(/Welcome/);   // placeholder for a section not migrated yet
    expect(screen.getByRole('button', { current: 'page' })).toBeTruthy();
  });
  it('the KPI bar shows the computed case and follows edits', () => {
    render(<App />);
    const r = computeCase(appStore().getState().doc);
    expect(kpi('Effective automation')).toBe(`${Math.round(r.model.eff)}%`);
    act(() => setPhaseAgent('V1', 100));
    expect(kpi('Glass ceiling')).toBe(`${Math.round(computeCase(appStore().getState().doc).model.ceiling)}%`);
    expect(kpi('Glass ceiling')).not.toBe(`${Math.round(r.model.ceiling)}%`);
  });
});

describe('undo / redo in the UI', () => {
  it('buttons, keyboard and toast', () => {
    render(<App />);
    const undoBtn = screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement,
      redoBtn = screen.getByRole('button', { name: 'Redo' }) as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(true);
    act(() => setAgentSup('A017', 100));
    expect(undoBtn.disabled).toBe(false);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(screen.getByRole('status').textContent).toMatch(/Undone: Set A017 to 100 % auto/);
    expect(redoBtn.disabled).toBe(false);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(screen.getByRole('status').textContent).toMatch(/Redone/);
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    fireEvent.click(redoBtn);
    expect(appStore().getState().history.undo).toHaveLength(1);
    fireEvent.click(undoBtn);
    expect(undoBtn.disabled).toBe(true);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(screen.getByRole('status').textContent).toBe('Nothing to undo');
  });
  it('text fields keep their native undo', () => {
    const input = document.createElement('input'); input.type = 'text';
    expect(shouldHandle({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, target: input })).toBeNull();
    const range = document.createElement('input'); range.type = 'range';
    expect(shouldHandle({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, target: range })).toBe('undo');
    expect(shouldHandle({ key: 'y', ctrlKey: true, metaKey: false, shiftKey: false, target: document.body })).toBe('redo');
    expect(shouldHandle({ key: 'z', ctrlKey: false, metaKey: false, shiftKey: false, target: document.body })).toBeNull();
  });
  it('the history panel lists the steps and jumps to any of them', () => {
    let t = 0; freshStore(() => (t += 10_000));
    render(<App />);
    act(() => { setAgentSup('A017', 100); setAgentSup('A018', 10); setPhaseAgent('V4', 50); });
    fireEvent.click(screen.getByText(/History \(3\)/));
    const list = screen.getByRole('list', { name: 'History' });
    expect(within(list).getAllByRole('button')).toHaveLength(4);
    fireEvent.click(within(list).getByText('Initial state'));
    expect(appStore().getState().history.undo).toHaveLength(0);
    expect(within(screen.getByRole('list', { name: 'History' })).getAllByRole('button')).toHaveLength(4);   // redo steps stay visible
    fireEvent.click(within(screen.getByRole('list', { name: 'History' })).getByText(/Set A017/));
    expect(appStore().getState().history.undo).toHaveLength(1);
  });
  it('the customer name is shown in the title (AgentCase for Acme), no longer editable in the header, and the subtitle is gone', () => {
    render(<App />);
    const top = screen.getByRole('banner');
    expect(within(top).queryByLabelText('Customer name')).toBeNull();
    expect(top.textContent).not.toMatch(/Confidence-Conditional Verdict/);
    expect(within(top).getByText(/^AgentCase/).textContent).not.toMatch(/ for /);
    act(() => setCustomerName('Acme'));
    expect(within(top).getByText(/^AgentCase for Acme/)).toBeTruthy();
  });
});

describe('KPI bar at horizons above 3 years', () => {
  it('shows the end-year figures of the Time Engine (they were €0k when read from the 3-entry model arrays)', () => {
    const doc = structuredClone(appStore().getState().doc);
    doc.dom.values.horizon = '5';
    appStore().load(doc);
    render(<App />);
    const want = computeCase(appStore().getState().doc);
    expect(want.endYear.index).toBe(5);
    expect(want.endYear.savings).toBeGreaterThan(0);
    expect(screen.getByText('Savings Y5').parentElement!.querySelector('.ac-kpi-v')!.textContent)
      .toBe(`€${Math.round(want.endYear.savings / 1000).toLocaleString('en-US')}k`);
  });
});
