// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Monthly from '@/ui/sections/economics/monthly';
import { extra, FIXTURES, legacyText, loadFixture, missingCells, PARITY_FIXTURES, squash } from '../../helpers/economics';
import { freshStore } from '../../store/helpers';
import { missingNumbers, renderedText } from '../../helpers/parity';
vi.mock('@/domain/programme/profile', async (orig) => (await import('../../helpers/legacyProgramme')).legacyProfileMock(orig));   // legacy parity, B9b

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);

type Dom = { T: Record<string, string[][]>; note: string };
const rows = (c: Element) => c.querySelectorAll('tbody tr').length;

describe('monthly section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Monthly />), legacy = legacyText(id, 'monthly');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it.each(FIXTURES)('reproduces the legacy monthly table and curve note cell by cell (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Monthly />), d = extra<Dom>('econ_dom', id);
    expect(missingCells(container, d, { tables: ['monthlyTable'] })).toEqual([]);
    expect(squash(container.querySelector('[data-testid="monthly-curve-note"]')!.textContent!)).toBe(squash(d.note));
  });
  it('decimates the chart for long horizons (every 3rd month beyond 40)', () => {
    const points = (c: Element) => c.querySelector('canvas')!.dataset.points;
    const { container } = render(<Monthly />);
    expect([rows(container), points(container)]).toEqual([36, '36']);
    act(() => setInput('horizon', 5));
    expect([rows(container), points(container)]).toEqual([60, '20']);
  });
  it('an input edit through the controller changes the series; undo restores it', () => {
    const { container } = render(<Monthly />), first = () => container.querySelectorAll('tbody tr')[0]!.textContent;
    const before = first();
    act(() => setInput('setupTooling', 235000));
    expect(first()).not.toBe(before);
    act(() => appStore().undo());
    expect(first()).toBe(before);
  });
  it('the setup column is empty once the setup spend is over and the cumulative turns positive at payback', () => {
    const { container } = render(<Monthly />), cells = (i: number) => [...container.querySelectorAll('tbody tr')[i]!.children].map((c) => c.textContent);
    expect(cells(0)[6]).toBe('€37,500');
    expect(cells(11)[6]).toBe('—');
    expect(cells(7)[9]!.startsWith('−€')).toBe(true);    // M8 still negative
    expect(cells(8)[9]!.startsWith('−€')).toBe(false);   // M9 = payback month
  });
});
