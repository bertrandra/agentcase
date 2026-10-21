// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addSeqSection, removeSeqSection, setSeqEnabled } from '@/controllers/navSequence';
import { setPersona } from '@/controllers/persona';
import { activeSeq, flatten } from '@/domain/nav/sequence';
import type { Persona } from '@/domain/pdc/personas';
import { appStore } from '@/store/instance';
import { App } from '@/ui/App';
import { uiStore } from '@/ui/uiState';
import { SECTIONS } from '@/ui/zones/registry';
import { loadCase } from '../helpers/pdc';

beforeEach(() => { uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false, menuHidden: false, wiz: { active: false, pos: 0, visited: [] } }); loadCase('golden'); });
afterEach(cleanup);
const seqOf = (id: string) => (appStore().getState().doc.PERSONAS as Persona[]).find((p) => p.id === id)!.seq!;
const stops = () => flatten(activeSeq(seqOf('builder'))!);
const label = (id: string) => SECTIONS.find((s) => s.id === id)!.label;
const start = () => fireEvent.click(screen.getByRole('button', { name: /Start guided sequence/ }));
const bar = () => within(screen.getByRole('region', { name: 'Guided sequence' }));
const active = () => uiStore.getState().activeSection;

describe('guided sequence player', () => {
  it('offers the sequence of a persona that has one, counting its steps; none for a persona without', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: 'Guided sequence' }).textContent).toContain(`(${seqOf('builder').steps.length} steps)`);
    act(() => setPersona('admin'));
    expect(screen.queryByRole('region', { name: 'Guided sequence' })).toBeNull();
  });
  it('Start opens the first section; Next / Prev walk the flattened sequence; Prev is disabled on the first stop', () => {
    render(<App />);
    start();
    const s = stops();
    expect(active()).toBe(s[0]!.sec);
    expect(bar().getByText(new RegExp(`section 1/${s.length}`))).toBeTruthy();
    expect((bar().getByRole('button', { name: '← Prev' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(bar().getByRole('button', { name: 'Next →' }));
    expect(active()).toBe(s[1]!.sec);
    expect(bar().getByText(new RegExp(`${label(s[1]!.sec)} · section 2/`))).toBeTruthy();
    fireEvent.click(bar().getByRole('button', { name: '← Prev' }));
    expect(active()).toBe(s[0]!.sec);
  });
  it('step chips jump to the step; the picker lists the sections of the current step; visited stops are ticked and counted', () => {
    render(<App />);
    start();
    const s = stops(), second = s.findIndex((x) => x.si === 1), chip = seqOf('builder').steps[1]!.label.split('·')[0]!.trim();
    fireEvent.click(bar().getByRole('button', { name: chip }));
    expect(active()).toBe(s[second]!.sec);
    const picker = within(bar().getByLabelText('Sections of this step'));
    expect(picker.getAllByRole('button')).toHaveLength(s.filter((x) => x.si === 1).length);
    expect(picker.getByRole('button', { current: 'step' }).textContent).toBe(label(s[second]!.sec));
    fireEvent.click(picker.getAllByRole('button')[1]!);
    expect(active()).toBe(s[second + 1]!.sec);
    expect(picker.getAllByRole('button')[0]!.textContent).toMatch(/^✓ /);
    const pct = Math.round((3 / s.length) * 100);
    expect(bar().getByText(`${pct}% of the sequence visited`)).toBeTruthy();
    expect(bar().getByRole('progressbar').getAttribute('aria-valuenow')).toBe(String(pct));
  });
  it('the sidebar and the group bar give way during the walk; Finish on the last stop and ✕ both exit', () => {
    render(<App />);
    start();
    expect(screen.queryByRole('navigation', { name: 'Group navigation' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull();
    const n = stops().length;
    for (let i = 1; i < n; i++) fireEvent.click(bar().getByRole('button', { name: 'Next →' }));
    expect(active()).toBe(stops()[n - 1]!.sec);
    fireEvent.click(bar().getByRole('button', { name: '✓ Finish' }));
    expect(uiStore.getState().wiz.active).toBe(false);
    expect(screen.getByRole('navigation', { name: 'Group navigation' })).toBeTruthy();
    start();
    fireEvent.click(bar().getByRole('button', { name: 'Exit the sequence' }));
    expect(screen.getByRole('button', { name: /Start guided sequence/ })).toBeTruthy();
  });
  it('is view state: starting and walking never touch the undo stack', () => {
    render(<App />);
    start();
    fireEvent.click(bar().getByRole('button', { name: 'Next →' }));
    expect(appStore().getState().history.undo).toHaveLength(0);
  });
  it('ends when the persona changes or the sequence is switched off, and undo brings the offer back', () => {
    render(<App />);
    start();
    act(() => setPersona('admin'));
    expect(uiStore.getState().wiz.active).toBe(false);
    act(() => setPersona('builder'));
    start();
    act(() => setSeqEnabled('builder', false));
    expect(screen.queryByRole('region', { name: 'Guided sequence' })).toBeNull();
    expect(uiStore.getState().wiz.active).toBe(false);
    act(() => { appStore().undo(); });
    expect(screen.getByRole('button', { name: /Start guided sequence/ })).toBeTruthy();
  });
  it('follows edits of the sequence while walking (a removed stop disappears, a new one is reachable)', () => {
    render(<App />);
    start();
    const before = stops().length;
    act(() => removeSeqSection('builder', 0, stops()[0]!.sec));
    expect(bar().getByText(new RegExp(`/${before - 1}$`))).toBeTruthy();
    act(() => addSeqSection('builder', 0, 'home'));
    expect(bar().getByText(new RegExp(`/${before}$`))).toBeTruthy();
  });
});
