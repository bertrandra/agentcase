// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Annual from '@/ui/sections/economics/annual';
import { extra, FIXTURES, legacyText, loadFixture, missingCells, PARITY_FIXTURES, statValue } from '../../helpers/economics';
import { freshStore } from '../../store/helpers';
import { missingNumbers, renderedText } from '../../helpers/parity';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);

type Dom = { T: Record<string, string[][]>; B: Record<string, string[][]> };

describe('annual section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Annual />), legacy = legacyText(id, 'annual');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it.each(FIXTURES)('reproduces the legacy annual table and summary cell by cell (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Annual />);
    expect(missingCells(container, extra<Dom>('econ_dom', id), { tables: ['annualTable'], bands: ['annualSummary'] })).toEqual([]);
  });
  it('an input edit through the controller changes setup and ROI; undo restores them', () => {
    const { container } = render(<Annual />), roi = statValue(container, 'ROI 3 years (net)');
    expect(statValue(container, 'Setup')).toBe('€225K');
    act(() => setInput('setupTooling', 235000));
    expect(statValue(container, 'Setup')).toBe('€425K');
    expect(statValue(container, 'ROI 3 years (net)')).not.toBe(roi);
    act(() => appStore().undo());
    expect([statValue(container, 'Setup'), statValue(container, 'ROI 3 years (net)')]).toEqual(['€225K', roi]);
  });
  it('labels follow the horizon (Y1 and the end year)', () => {
    const { container } = render(<Annual />);
    act(() => setInput('horizon', 10));
    expect(statValue(container, 'Run Y10')).toBeDefined();
    expect(statValue(container, 'ROI 10 years (net)')).toBeDefined();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
  });
  it('shows n/a for the ROI when nothing was invested', () => {
    loadFixture('econ-no-setup');
    expect(statValue(render(<Annual />).container, 'ROI 3 years (net)')).toBe('n/a');
  });
});
