// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mcsRunStore } from '@/controllers/modelRun';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/model-engine/evidence';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

beforeEach(() => { mcsRunStore.setState({ last: null, running: false }); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const ev = () => (doc().MODEL as unknown as { EVIDENCE: { stage: string; drivers: Record<string, { tier: string; source: string; asOf: string; owner: string }> } }).EVIDENCE;
const undo = (n = 1) => act(() => { for (let i = 0; i < n; i++) appStore().undo(); });
const tier = (label: string) => screen.getByLabelText(`Evidence tier of ${label}`);

describe('model-evidence section (P6 evidence ledger)', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'model-evidence');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('grades the case from the tiers; the stage sets what is expected', () => {
    loadFixture('golden');
    render(<Section />);
    expect(screen.getByText('D')).toBeTruthy();                                   // all ASSUMPTION: 25 %
    expect(screen.getByText(/score 25%/)).toBeTruthy();
    expect(screen.getByText('Below expectation - see the upgrade path below, not a blocker.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Case stage'), { target: { value: 'gateReview' } });
    expect(ev().stage).toBe('gateReview');
    expect(screen.getByText(/Expected at/).textContent).toContain('Gate review');
    undo();
    expect(ev().stage).toBe('qualification');
  });
  it('a MEASURED tier needs a source and a fresh date, else it counts as BENCHMARK; editing a tier switches the ledger on', () => {
    loadFixture('golden');
    render(<Section />);
    ['Acceptance rate (P1)', 'Year-1 ramp', 'Year-2 ramp', 'Year-3 ramp', 'Loaded day rate (blended)', 'Supervising capacity (P3)', 'Token unit price'].forEach((l) => fireEvent.change(tier(l), { target: { value: 'MEASURED' } }));
    expect(doc().MODEL.FLAGS.evl).toBe(true);
    expect(screen.getAllByText('used as BENCHMARK - see note')).toHaveLength(7);
    expect(screen.getByText(/score 60%/)).toBeTruthy();                           // BENCHMARK for all
    fireEvent.change(screen.getByLabelText('Source of Acceptance rate (P1)'), { target: { value: 'pilot log' } });
    fireEvent.change(screen.getByLabelText('As of date of Acceptance rate (P1)'), { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText('Owner of Acceptance rate (P1)'), { target: { value: 'A. Kim' } });
    expect(ev().drivers.p).toMatchObject({ tier: 'MEASURED', source: 'pilot log', asOf: '2099-01-01', owner: 'A. Kim' });
    expect(screen.getAllByText('used as BENCHMARK - see note')).toHaveLength(6);
    expect(screen.getByText(/score 66%/)).toBeTruthy();                           // 1/7 MEASURED, 6/7 BENCHMARK
  });
  it('running P4 replaces the equal-weight placeholder by the tornado influence weights', async () => {
    loadFixture('golden');
    render(<Section />);
    expect(screen.getByText(/Using equal weighting/)).toBeTruthy();
    fireEvent.click(screen.getByText('▶ Run P4 for real weights'));
    await waitFor(() => expect(mcsRunStore.getState().last).not.toBeNull());
    await waitFor(() => expect(screen.queryByText(/Using equal weighting/)).toBeNull());
    expect(screen.queryByText('▶ Run P4 for real weights')).toBeNull();
    const weights = screen.getAllByText(/^\d+%$/).map((e) => e.textContent);
    expect(new Set(weights).size).toBeGreaterThan(1);                             // no longer 14 % everywhere
  }, 30000);
});
