// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import RateCard from '@/ui/sections/baseline/ratecard';
import { appStore } from '@/store/instance';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtures';

afterEach(cleanup);

describe('ratecard section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<RateCard />);
    const legacy = legacySectionText(fx, 'ratecard');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
    expect(renderedText(container)).toContain('F — Out-of-class');
  });
  it('renders the 5 × 7 matrix from RATE, with the location classes', () => {
    const s = loadFixture('golden');
    render(<RateCard />);
    const doc = s.getState().doc;
    expect(screen.getAllByRole('spinbutton')).toHaveLength(35);
    expect((screen.getByLabelText('France band B day rate') as HTMLInputElement).value).toBe(String(doc.RATE.France!.B));
    expect(screen.getAllByText('Offshore').length).toBeGreaterThan(1);
  });
  it('editing a rate re-prices the baseline (document → engine) and undo restores it', () => {
    const s = loadFixture('golden');
    render(<RateCard />);
    const before = computeCase(s.getState().doc).model.base.cost;
    fireEvent.change(screen.getByLabelText('France band B day rate'), { target: { value: '600' } });
    expect(s.getState().doc.RATE.France!.B).toBe(600);
    expect(computeCase(s.getState().doc).model.base.cost).toBeGreaterThan(before);
    expect((screen.getByLabelText('France band B day rate') as HTMLInputElement).value).toBe('600');
    act(() => { appStore().undo(); });
    expect(computeCase(s.getState().doc).model.base.cost).toBe(before);
  });
  it('a non-numeric rate reads as 0 like the legacy handler', () => {
    const s = loadFixture('golden');
    render(<RateCard />);
    fireEvent.change(screen.getByLabelText('India band A day rate'), { target: { value: '' } });
    expect(s.getState().doc.RATE.India!.A).toBe(0);
  });
});
