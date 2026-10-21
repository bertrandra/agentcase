// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { makeCtx } from '@/domain';
import { mcSeedOf, runMonteCarlo } from '@/domain/stress';
import { appStore } from '@/store/instance';
import { simStore } from '@/store/simulation';
import MonteCarlo from '@/ui/sections/stress/montecarlo';
import { fmtEur } from '@/ui/sections/stress/fmt';
import { loadExtra } from '../../helpers/extras';
import { missingFor, openFixture, PARITY_FIXTURES } from '../../helpers/stressParity';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const run = () => fireEvent.click(screen.getByText('▶ Run simulation'));

describe('Monte Carlo section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    expect(missingFor(MonteCarlo, 'montecarlo', fx)).toEqual([]);
  });
  it('before a run it says so; the run shows the cards of the seeded distribution (same as the legacy for the stored seed)', () => {
    openFixture('mc-seed-7');
    render(<MonteCarlo />);
    expect(screen.getByText(/No run yet/)).toBeTruthy();
    run();
    const c = makeCtx(appStore().getState().doc), r = runMonteCarlo(c, 300, mcSeedOf(c));
    expect(screen.getByText('300 · 7')).toBeTruthy();
    expect(screen.getByText(fmtEur(r.stats.p50))).toBeTruthy();
    expect(screen.getByText(`${Math.round(r.stats.pNetNeg * 100)}%`)).toBeTruthy();
    // the legacy run of the same fixture with 200 draws; DEV-MC-QUANTILE moved the percentile estimator by under one rank (exact rule: domain/stress.test.ts)
    const legacy = loadExtra('mcRun', 'mc-seed-7') as { stats: { p50: number } };
    expect(Math.abs(runMonteCarlo(c, 200, 7).stats.p50 - legacy.stats.p50)).toBeLessThan(1e-3 * Math.abs(legacy.stats.p50));
  });
  it('seed edit: a different seed gives a different distribution, undo returns the stored seed', () => {
    openFixture('mc-seed-7');
    render(<MonteCarlo />);
    run();
    const before = simStore.getState().run!.stats.p50;
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '8' } });
    run();
    expect(simStore.getState().run!.seed).toBe(8);
    expect(simStore.getState().run!.stats.p50).not.toBe(before);
    act(() => { appStore().undo(); });
    expect((screen.getByLabelText('Seed') as HTMLInputElement).value).toBe('7');
  });
  it('a spread edit changes the ranges (amber when edited), reset ranges restores the defaults', () => {
    openFixture('golden');
    render(<MonteCarlo />);
    const input = screen.getByLabelText('Spread of Year-3 ramp (pts)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '30' } });
    expect(input.value).toBe('30');
    expect(input.style.borderColor).toContain('amber');
    fireEvent.click(screen.getByText('↺ Reset ranges'));
    expect((screen.getByLabelText('Spread of Year-3 ramp (pts)') as HTMLInputElement).value).toBe('10');
  });
  it('the scenario changing after a run raises the stale banner, and auto re-run refreshes the distribution', () => {
    vi.useFakeTimers();
    openFixture('golden');
    render(<MonteCarlo />);
    run();
    const first = simStore.getState().run!.fingerprint;
    act(() => { setInput('y1Ramp', 40); });
    expect(simStore.getState().run!.fingerprint).toBe(first);
    act(() => { vi.advanceTimersByTime(600); });
    expect(simStore.getState().run!.fingerprint).not.toBe(first);
    expect(screen.queryByText(/Scenario changed since the last run/)).toBeNull();
  });
  it('with auto re-run off the banner stays until the user re-runs', () => {
    vi.useFakeTimers();
    openFixture('golden');
    render(<MonteCarlo />);
    run();
    fireEvent.click(screen.getByLabelText('Auto re-run on scenario change'));
    act(() => { setInput('y1Ramp', 40); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Scenario changed since the last run/)).toBeTruthy();
    fireEvent.click(screen.getByText('⟳ Re-run now'));
    expect(screen.queryByText(/Scenario changed since the last run/)).toBeNull();
  });
});
