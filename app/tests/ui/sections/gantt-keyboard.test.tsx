// @vitest-environment jsdom
import { caseValues } from '@/domain/process';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appStore } from '@/store/instance';
import { processView } from '@/ui/sections/scope/process/view';
import Gantt from '@/ui/sections/verify/gantt';
import { uiStore } from '@/ui/uiState';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); uiStore.setState({ toast: '', activeSection: 'gantt' }); processView.setState({ selected: null }); });
afterEach(cleanup);

const vals = () => caseValues(appStore().getState().doc);
const bar = (name: RegExp) => screen.getByRole('group', { name });

/**
 * The program bars of the Gantt (keyboard). Phase B9a (SPEC_BPMN § 19.7 F-B71, F-B72; DEV-B9A-CONTEXT-SCREENS): the bars are programme activities,
 * whose durations are edited in the Process section only. A bar is a focusable read-only group; Enter (or a click) opens its activity in the
 * Process section; arrows no longer resize it. Alt+arrows still move the roadmap start, a case-level date.
 */
describe('gantt keyboard', () => {
  it('program bars are focusable read-only groups with date text, none is a slider', () => {
    render(<Gantt />);
    const d = bar(/Discover/);
    expect(d.tabIndex).toBe(0);
    expect(d.getAttribute('aria-label')).toMatch(/^.*Discover, 1 Sep 2026 to 29 Sep 2026, 4 wk$/);
    expect(bar(/Agentic Build/).getAttribute('aria-label')).toMatch(/12 mo ramp/);
    expect(bar(/Agentic Run/).tabIndex).toBe(0);
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
  });

  it('Enter opens the bar\'s activity in the Process section; arrows do not resize it', () => {
    render(<Gantt />);
    const d = bar(/Discover/), before = vals().rmD1, n = appStore().getState().history.undo.length;
    fireEvent.keyDown(d, { key: 'ArrowRight' });
    fireEvent.keyDown(d, { key: 'ArrowRight', shiftKey: true });
    expect([vals().rmD1, appStore().getState().history.undo.length]).toEqual([before, n]);
    fireEvent.keyDown(d, { key: 'Enter' });
    expect(uiStore.getState().activeSection).toBe('process');
    expect(processView.getState().selected).toBe('prog-stage-discover');
    fireEvent.click(bar(/Agentic Build/));
    expect(processView.getState().selected).toBe('prog-build');
  });

  it('Alt+arrows move the roadmap start (Shift: a week)', () => {
    render(<Gantt />);
    const b = bar(/Agentic Build/);
    fireEvent.keyDown(b, { key: 'ArrowRight', altKey: true });
    expect(vals().rmStart).toBe('2026-09-02');
    fireEvent.keyDown(b, { key: 'ArrowLeft', altKey: true, shiftKey: true });
    expect(vals().rmStart).toBe('2026-08-26');
    expect(uiStore.getState().toast).toContain('roadmap starts 26 Aug 2026');
    expect(vals().setupDuration).toBe('12');
  });

  it('ignores other keys', () => {
    render(<Gantt />);
    const n = appStore().getState().history.undo.length;
    fireEvent.keyDown(bar(/Discover/), { key: 'a' });
    fireEvent.keyDown(bar(/Agentic Run/), { key: 'ArrowRight' });
    expect(appStore().getState().history.undo.length).toBe(n);
  });
});
