// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Financial from '@/ui/sections/economics/financial';
import { extra, FIXTURES, legacyText, loadFixture, missingCells, PARITY_FIXTURES, squash, statValue } from '../../helpers/economics';
import { freshStore } from '../../store/helpers';
import { missingNumbers, renderedText } from '../../helpers/parity';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);

type Dom = { T: Record<string, string[][]>; B: Record<string, string[][]>; how: string[][]; reco: string; sd: string[]; sdRows: string[][] };
const TABLES = ['investTable', 'opCostTable', 'savTable', 'plTable', 'fteShiftTable', 'roiYearTable'];
const BANDS = ['roiSummary', 'investSummary', 'opCostSummary', 'savSummary', 'plSummary', 'fteShiftSummary'];

describe('financial section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Financial />), legacy = legacyText(id, 'financial');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it.each(FIXTURES)('reproduces the legacy tables, bands, verdict and walk-through cell by cell (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Financial />), d = extra<Dom>('econ_dom', id);
    expect(missingCells(container, d, { tables: TABLES, bands: BANDS })).toEqual([]);
    expect(squash(container.querySelector('[data-verdict]')!.textContent!)).toBe(squash(d.reco));
    expect(squash(container.textContent!)).toContain(squash(d.how.map((r) => r.join('')).join('')));
    expect(squash(container.textContent!)).toContain(squash(d.sd.at(-1)!));
    expect(d.sdRows.every((r) => r.every((c) => squash(container.textContent!).includes(squash(c))))).toBe(true);
  });
  it('the verdict follows the ROI band and "n/a" appears when nothing was invested', () => {
    const verdict = (id: string) => { loadFixture(id); const r = render(<Financial />); const v = r.container.querySelector('[data-verdict]')!.getAttribute('data-verdict'); const roi = statValue(r.container, 'ROI (net, 3y)'); r.unmount(); return [v, roi]; };
    expect(verdict('golden')).toEqual(['go', '713%']);
    expect(verdict('econ-roi-mid')[0]).toBe('conditional');
    expect(verdict('econ-roi-low')[0]).toBe('reconsider');
    expect(verdict('econ-no-setup')[1]).toBe('n/a');
  });
  it('an input edit through the controller changes the figures; undo restores them', () => {
    const { container } = render(<Financial />);
    expect(statValue(container, 'Setup cost')).toBe('€225,000');
    const before = statValue(container, 'ROI (net, 3y)');
    act(() => setInput('setupTooling', 135000));
    expect(statValue(container, 'Setup cost')).toBe('€325,000');
    expect(statValue(container, 'ROI (net, 3y)')).not.toBe(before);
    act(() => appStore().undo());
    expect(statValue(container, 'Setup cost')).toBe('€225,000');
    expect(statValue(container, 'ROI (net, 3y)')).toBe(before);
  });
  it('the horizon drives the year columns and the headings', () => {
    const { container } = render(<Financial />);
    act(() => setInput('horizon', 5));
    expect(container.querySelector('h1')!.textContent).toBe('Financial Summary — 5-year case');
    expect(container.textContent).toContain('5-Year P&L & Cash Flow');
    const invest = [...container.querySelectorAll('table')].find((t) => t.querySelector('th')!.textContent === 'Category')!;
    expect(invest.querySelectorAll('thead th')).toHaveLength(7);   // Category + Y1..Y5 + Total
    act(() => appStore().undo());
    expect(container.querySelector('h1')!.textContent).toBe('Financial Summary — 3-year case');
  });
});
