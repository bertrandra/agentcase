// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { mcsRunStore } from '@/controllers/modelRun';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/model-engine/stochastic';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

beforeEach(() => { mcsRunStore.setState({ last: null, running: false }); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const model = () => computeCase(doc()).model;
const undo = (n = 1) => act(() => { for (let i = 0; i < n; i++) appStore().undo(); });

describe('model-stochastic section (P4 stochastic layer and baseline drift)', () => {
  it.each([...PARITY_FIXTURES, ...['me-mcs', 'me-lce']])('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'model-stochastic');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('Run is disabled until the phase is on; the settings are clamped case edits', () => {
    loadFixture('golden');
    render(<Section />);
    expect((screen.getByText('▶ Run simulation') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Enable P4'));
    expect(doc().MODEL.FLAGS.mcs).toBe(true);
    expect((screen.getByText('▶ Run simulation') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('Draws'), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('ρ (organisational)'), { target: { value: '0.6' } });
    expect(doc().MODEL.MCS).toMatchObject({ draws: 5000, seed: 42, rho: 0.6, enabled: true });
    undo(4);
    expect(doc().MODEL.FLAGS.mcs).toBe(false);
  });
  it('a seeded run is reproducible and shows the distribution, the tornado and the convergence', async () => {
    loadFixture('golden');
    render(<Section />);
    fireEvent.click(screen.getByText('Enable P4'));
    fireEvent.change(screen.getByLabelText('Draws'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('▶ Run simulation'));
    await screen.findByText(/Distribution — n=100, seed=20260728/);
    expect(screen.getByText(/Tornado — driver P10→P90 swing on Y3 savings/)).toBeTruthy();
    expect(screen.getByText('Loaded day rate (blended)')).toBeTruthy();
    const first = mcsRunStore.getState().last!;
    expect(first.stats.savY3.p10).toBeLessThanOrEqual(first.stats.savY3.p50);
    expect(first.stats.savY3.p50).toBeLessThanOrEqual(first.stats.savY3.p90);
    fireEvent.click(screen.getByText('▶ Run simulation'));
    await waitFor(() => expect(mcsRunStore.getState().running).toBe(false));
    await waitFor(() => expect(mcsRunStore.getState().last).not.toBe(first));
    expect(mcsRunStore.getState().last!.stats).toEqual(first.stats);
    expect(model().yearSav[2]).toBeCloseTo(891555.17, 1);   // the deterministic case is untouched by the draws
  });
  it('switching the phase off keeps the last run visible with a notice', async () => {
    loadFixture('golden');
    render(<Section />);
    fireEvent.click(screen.getByText('Enable P4'));
    fireEvent.change(screen.getByLabelText('Draws'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('▶ Run simulation'));
    await screen.findByText(/Distribution/);
    fireEvent.click(screen.getByText('Disable P4'));
    expect(screen.getByText(/Showing the last run \(n=100/)).toBeTruthy();
    expect(screen.queryByText(/Distribution/)).toBeNull();
  });
  it('baseline drift: gross savings stay, the attributable figure falls by the wedge; undo restores', () => {
    loadFixture('golden');
    render(<Section />);
    const gross = model().yearSav[2] as number;
    fireEvent.click(screen.getByText('Enable baseline drift'));
    expect(doc().MODEL.CBD.driftRate).toBe(0.03);
    const m = model();
    expect(m.yearSav[2]).toBeCloseTo(gross, 6);
    expect(m.cbd.yearSavAttributable[2]).toBeLessThan(gross);
    expect(m.cbd.wedge[2]).toBeCloseTo(gross - (m.cbd.yearSavAttributable[2] as number), 6);
    fireEvent.change(screen.getByLabelText('δ — secular drift (/yr)'), { target: { value: '0.1' } });
    expect(model().cbd.wedge[2]).toBeGreaterThan(m.cbd.wedge[2] as number);
    fireEvent.change(screen.getByLabelText('δ — secular drift (/yr)'), { target: { value: '0' } });
    expect(doc().MODEL.FLAGS.cbd).toBe(false);   // typing 0 switches the phase off, like legacy
    undo(3);
    expect(model().cbd.wedge[2]).toBeCloseTo(0, 6);
  });
});
