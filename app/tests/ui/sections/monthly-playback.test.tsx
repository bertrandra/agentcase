// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import Playback from '@/ui/sections/present/monthly-playback';
import { legacyText } from '../../helpers/economics';
import { missingNumbers, renderedText } from '../../helpers/parity';
import { loadCase } from '../../helpers/pdc';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const FOUR = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
const readout = () => screen.getByText(/^Month \d+ · /).textContent;

describe('monthly-playback section', () => {
  it.each(FOUR)('shows every figure the legacy section showed (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Playback />), legacy = legacyText(id, 'monthly-playback');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('starts at AS-IS with the three default metrics in sequence', () => {
    loadCase('golden');
    render(<Playback />);
    expect(readout()).toBe('Month 0 · AS-IS');
    expect(screen.getByTestId('mp-title').textContent).toBe('Human FTE / agent vFTE');
    expect(screen.getByTestId('mp-pos').textContent).toBe('1 / 3');
  });
  it('the scrubber seeks and pauses; the year label follows the month', () => {
    loadCase('golden');
    render(<Playback />);
    fireEvent.change(screen.getByLabelText('Position in the trajectory (months)'), { target: { value: '14' } });
    expect(readout()).toBe('Month 14 · Y2');
  });
  it('play steps one month per tick, moves on to the next metric at the end, then loops', () => {
    loadCase('golden');
    render(<Playback />);
    fireEvent.click(screen.getByText('▶ Play'));
    act(() => { vi.advanceTimersByTime(200 * 3); });
    expect(readout()).toBe('Month 3 · Y1');
    act(() => { vi.advanceTimersByTime(200 * 34); });          // 37 ticks: past month 36
    expect(screen.getByTestId('mp-pos').textContent).toBe('2 / 3');
    expect(readout()).toBe('Month 0 · AS-IS');
    act(() => { vi.advanceTimersByTime(200 * 37 * 2); });      // through the last two metrics: back to the first
    expect(screen.getByTestId('mp-pos').textContent).toBe('1 / 3');
    fireEvent.click(screen.getByText('⏸ Pause'));
    expect(screen.getByText('▶ Play')).toBeTruthy();
  });
  it('without loop it stops on the last month of the last metric', () => {
    loadCase('golden');
    render(<Playback />);
    fireEvent.click(screen.getByLabelText('Loop'));
    fireEvent.change(screen.getByLabelText('Speed'), { target: { value: '4' } });
    fireEvent.click(screen.getByText('▶ Play'));
    act(() => { vi.advanceTimersByTime(50 * 37 * 3 + 500); });
    expect(readout()).toBe('Month 36 · Y3');
    expect(screen.getByText('▶ Play')).toBeTruthy();
  });
  it('metrics can be switched off; none left shows the empty state; a horizon change resets the player', () => {
    loadCase('golden');
    const { container } = render(<Playback />);
    for (const l of ['Human FTE / agent vFTE', 'Monthly run cost', 'Cumulative savings']) fireEvent.click(screen.getByLabelText(l));
    expect(container.textContent).toContain('Select at least one metric');
    fireEvent.click(screen.getByLabelText('Velocity'));
    expect(screen.getByTestId('mp-title').textContent).toBe('Velocity');
    fireEvent.change(screen.getByLabelText('Position in the trajectory (months)'), { target: { value: '20' } });
    act(() => setInput('horizon', 5));
    expect(readout()).toBe('Month 0 · AS-IS');
    expect((screen.getByLabelText('Position in the trajectory (months)') as HTMLInputElement).max).toBe('60');
  });
});
