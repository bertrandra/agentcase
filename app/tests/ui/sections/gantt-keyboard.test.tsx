// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appStore } from '@/store/instance';
import Gantt from '@/ui/sections/verify/gantt';
import { uiStore } from '@/ui/uiState';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); uiStore.setState({ toast: '' }); });
afterEach(cleanup);

const vals = () => appStore().getState().doc.dom.values;
const bar = (name: RegExp) => screen.getByRole('slider', { name });

describe('gantt keyboard editing', () => {
  it('program bars are focusable sliders with date text; derived bars are focusable groups', () => {
    render(<Gantt />);
    const d = bar(/Discover duration in weeks/);
    expect(d.tabIndex).toBe(0);
    expect(d.getAttribute('aria-valuenow')).toBe(vals().rmD1);
    expect(d.getAttribute('aria-valuetext')).toMatch(/^.*Discover, 1 Sep 2026 to 29 Sep 2026, 4 wk$/);
    expect(bar(/Agentic Build.*months/).getAttribute('aria-valuenow')).toBe('12');
    const run = screen.getByRole('group', { name: /Agentic Run/ });
    expect(run.tabIndex).toBe(0);
    expect(screen.queryByRole('slider', { name: /Agentic Run/ })).toBeNull();
  });

  it('arrows resize through the input (Shift = bigger step), announce, and a key burst is one undo step', () => {
    render(<Gantt />);
    const d = bar(/Discover/), before = vals().rmD1, undoDepth = appStore().getState().history.undo.length;
    fireEvent.keyDown(d, { key: 'ArrowRight' });
    fireEvent.keyDown(d, { key: 'ArrowRight' });
    fireEvent.keyDown(d, { key: 'ArrowRight', shiftKey: true });
    expect(vals().rmD1).toBe(String(+before! + 6));
    expect(uiStore.getState().toast).toContain('10 weeks');
    expect(appStore().getState().history.undo.length).toBe(undoDepth + 1);
    act(() => appStore().undo());
    expect(vals().rmD1).toBe(before);
  });

  it('arrow left stops at the minimum; setup duration and the Alt+arrow start move edit their own inputs', () => {
    render(<Gantt />);
    const b = bar(/Agentic Build/);
    for (let i = 0; i < 15; i++) fireEvent.keyDown(b, { key: 'ArrowLeft' });
    expect(vals().setupDuration).toBe('1');
    fireEvent.keyDown(b, { key: 'ArrowRight', shiftKey: true });
    expect(vals().setupDuration).toBe('4');
    fireEvent.keyDown(b, { key: 'ArrowRight', altKey: true });
    expect(vals().rmStart).toBe('2026-09-02');
    fireEvent.keyDown(b, { key: 'ArrowLeft', altKey: true, shiftKey: true });
    expect(vals().rmStart).toBe('2026-08-26');
    expect(uiStore.getState().toast).toContain('roadmap starts 26 Aug 2026');
  });

  it('ignores other keys and read-only bars', () => {
    render(<Gantt />);
    const n = appStore().getState().history.undo.length;
    fireEvent.keyDown(bar(/Discover/), { key: 'a' });
    fireEvent.keyDown(screen.getByRole('group', { name: /Agentic Run/ }), { key: 'ArrowRight' });
    expect(appStore().getState().history.undo.length).toBe(n);
  });
});
