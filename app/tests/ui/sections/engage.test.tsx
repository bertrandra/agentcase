// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import Engage from '@/ui/sections/frame/engage';
import { setInput } from '@/controllers/inputs';
import { processView } from '@/ui/sections/scope/process/view';
import { uiStore } from '@/ui/uiState';
import { FIXTURES, loadFixture, parityGap } from './frameHelpers';

beforeAll(() => {   // jsdom has no canvas: ChartPanel tolerates it, the noise is silenced here
  HTMLCanvasElement.prototype.getContext = () => null;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { if (screen.queryByText('▾ Hide tracker')) fireEvent.click(screen.getByText('▾ Hide tracker')); cleanup(); });
const doc = () => appStore().getState().doc;

describe('engage section', () => {
  // the "now" marker and the roadmap dates depend on the clock only through the marker, which carries no figure
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (f) => {
    loadFixture(f);
    const { container } = render(<Engage />);
    expect(parityGap(f, 'engage', container)).toEqual([]);
  });
  // Phase B9a (SPEC_BPMN § 19.7, DEV-B9A-CONTEXT-SCREENS): the stage durations are programme activity parameters, edited in the Process section;
  // this screen links to them and follows their values.
  it('the stages are read-only references that open the Process section; a duration change moves the runway, dates and roadmap; undo restores', () => {
    loadFixture('golden');
    const { container } = render(<Engage />);
    expect(screen.getByText('18 wk')).toBeTruthy();
    expect(screen.queryByLabelText('Pilot & Prove (wk)')).toBeNull();
    fireEvent.click(screen.getByText('Open Pilot & Prove in Process'));
    expect([uiStore.getState().activeSection, processView.getState().selected]).toEqual(['process', 'prog-stage-pilotProve']);
    act(() => { setInput('rmD4', '10'); });
    expect(doc().dom.values.rmD4).toBe('10');
    expect(screen.getByText('22 wk')).toBeTruthy();
    expect(screen.getByText('2027-02-02')).toBeTruthy();          // decide & scale: 2026-09-01 + 22 weeks
    expect(container.textContent).toContain('2026-11-24 → 2027-02-02');
    expect(computeCase(doc()).model.eff).toBeGreaterThan(0);
    act(() => { appStore().undo(); });
    expect(screen.getByText('18 wk')).toBeTruthy();
  });
  it('the Gantt tick edits dom.checked; a stage card opens its section', () => {
    loadFixture('golden');
    render(<Engage />);
    fireEvent.click(screen.getByLabelText(/Display Discover/));
    expect(doc().dom.checked.ganttShowOnboarding).toBe(false);
    fireEvent.click(screen.getByText(/2 · Validate/).closest('button')!);
    expect(uiStore.getState().activeSection).toBe('montecarlo');
  });
  it('the tracker is collapsed, opens on demand, records actuals and scores them like the legacy', () => {
    loadFixture('frame-engage');
    render(<Engage />);
    expect(screen.queryByText('Overall status')).toBeNull();
    fireEvent.click(screen.getByText('▸ Show tracker'));
    expect(screen.getByText('Mostly on track — 1 quarter(s) behind')).toBeTruthy();   // legacy frameTrackStatus
    expect(screen.getByText('3 / 12')).toBeTruthy();
    expect(screen.getAllByRole('row').length).toBe(13);                                // header + 12 quarters
    fireEvent.change(screen.getByLabelText('Adoption actual Q4'), { target: { value: '99' } });
    expect((doc().trackActuals as Record<string, { ad: number | null } | undefined>).q4?.ad).toBe(99);
    expect(screen.getByText('4 / 12')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Adoption actual Q4'), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Adoption actual Q4'));
    expect((doc().trackActuals as Record<string, { ad: number | null } | undefined>).q4?.ad).toBeNull();
    act(() => { appStore().undo(); appStore().undo(); });
    expect(screen.getByText('3 / 12')).toBeTruthy();
  });
});
