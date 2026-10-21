// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Run from '@/ui/sections/economics/run';
import { extra, FIXTURES, legacyText, loadFixture, missingCells, PARITY_FIXTURES, statValue } from '../../helpers/economics';
import { freshStore } from '../../store/helpers';
import { missingNumbers, renderedText } from '../../helpers/parity';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);

type Dom = { T: Record<string, string[][]>; B: Record<string, string[][]> };

describe('run section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Run />), legacy = legacyText(id, 'run');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it.each(FIXTURES)('reproduces the legacy run table and summary cell by cell (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Run />);
    expect(missingCells(container, extra<Dom>('econ_dom', id), { tables: ['runTable'], bands: ['runSummary'] })).toEqual([]);
  });
  it('the stacked chart has the four cost series, one point per year', () => {
    const { container } = render(<Run />), c = container.querySelector('canvas')!;
    expect([c.dataset.points, c.dataset.series]).toEqual(['3', 'Team:3,Agentic run:3,Tokens:3,Infra:3']);
  });
  it('an input edit through the controller changes the run cost; undo restores it', () => {
    const { container } = render(<Run />), before = statValue(container, 'Cumulative run');
    act(() => setInput('tokensPerArt', 400000));
    expect(statValue(container, 'Cumulative run')).not.toBe(before);
    act(() => appStore().undo());
    expect(statValue(container, 'Cumulative run')).toBe(before);
  });
  it('the horizon adds year rows but the summary keeps Y1..Y3', () => {
    const { container } = render(<Run />);
    act(() => setInput('horizon', 5));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(container.querySelector('canvas')!.dataset.points).toBe('5');
    expect(['Run Y1', 'Run Y3', 'Run Y4'].map((l) => statValue(container, l) !== undefined)).toEqual([true, true, false]);
  });
});
