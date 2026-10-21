// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setAgentSup, setPhaseAgent } from '@/controllers/artefacts';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import { App } from '@/ui/App';
import { uiStore } from '@/ui/uiState';
import { SECTIONS, visibleSections } from '@/ui/zones/registry';
import { shouldHandle } from '@/ui/shell/useShortcuts';
import { freshStore } from '../store/helpers';

beforeEach(() => { freshStore(); uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false }); });
afterEach(cleanup);
const kpi = (label: string) => screen.getByText(label).parentElement!.querySelector('.ac-kpi-v')!.textContent;

describe('shell zones', () => {
  it('renders the five zones with landmarks', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByLabelText('Headline results')).toBeTruthy();
    expect(screen.getByText(/History \(0\)/)).toBeTruthy();
  });
  it('the nav lists exactly the sections of the persona, grouped', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(within(nav).getAllByRole('button')).toHaveLength(visibleSections('builder').length);
    act(() => { fireEvent.change(screen.getByLabelText('Persona'), { target: { value: 'advanced' } }); });
    expect(within(nav).getAllByRole('button')).toHaveLength(SECTIONS.length);
    expect(within(nav).getAllByRole('heading').length).toBeGreaterThan(8);
  });
  it('persona changes are not undoable; navigation opens the section placeholder', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Persona'), { target: { value: 'clientcase' } });
    expect(appStore().getState().history.undo).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /^🎯 Scope$/ }));
    expect((await screen.findByRole('heading', { level: 1, name: 'Scope — target artifact selection' }))).toBeTruthy();   // migrated section (lazy)
    fireEvent.click(screen.getByRole('button', { name: /Welcome/ }));
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
    const undoBtn = screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement, redoBtn = screen.getByRole('button', { name: 'Redo' }) as HTMLButtonElement;
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
  it('typing the customer name is one coalesced step', () => {
    render(<App />);
    const box = screen.getByLabelText('Customer name');
    ['A', 'Ac', 'Acm', 'Acme'].forEach((v) => fireEvent.change(box, { target: { value: v } }));
    expect(appStore().getState().history.undo).toHaveLength(1);
    expect((box as HTMLInputElement).value).toBe('Acme');
  });
});
