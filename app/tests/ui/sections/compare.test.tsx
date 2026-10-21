// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { compareData } from '@/domain/stress';
import { appStore } from '@/store/instance';
import Compare from '@/ui/sections/stress/compare';
import { loadExtra } from '../../helpers/extras';
import { numberTokens, renderedText } from '../../helpers/parity';
import { missingFor, openFixture, PARITY_FIXTURES } from '../../helpers/stressParity';

afterEach(cleanup);
const data = () => compareData(makeCtx(appStore().getState().doc));
const cell = (metric: string, col: number) => screen.getByText(metric).closest('tr')!.children[col]!.textContent;

describe('3-way comparison section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    // DEV-COMPARE-ENGINE: the Agentic cumulative saving and (off the typed ramps) velocity rows follow the engine, so the legacy figures of those rows are not expected
    const rows = (loadExtra('compareView', fx) as { table: string[][] }).table;
    expect(missingFor(Compare, 'compare', fx, [3, 4].flatMap((i) => numberTokens(rows[i]!.join('  '))))).toEqual([]);
  });
  it('the key-figures table is the engine output', () => {
    openFixture('golden');
    render(<Compare />);
    const rows = data().rows;
    expect(cell('Final headcount (FTE)', 3)).toBe(rows[0]![3]);
    expect(cell('Cumulative saving', 2)).toBe(rows[3]![2]);
    expect(rows[0]![3]).toBe('3.8');
  });
  it('the classic saving rate moves the AS-IS + saving column; undo restores it', () => {
    openFixture('golden');
    const { container } = render(<Compare />);
    const before = renderedText(container);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '10' } });
    expect(screen.getByLabelText(/Classic annual saving.*10%\/yr/)).toBeTruthy();
    expect(data().classic.cost[2]).toBeCloseTo(1768800 * 0.9 ** 3, 0);
    expect(renderedText(container)).not.toBe(before);
    act(() => { appStore().undo(); });
    expect(renderedText(container)).toBe(before);
  });
  it('the agentic column follows the case: a larger Y3 ramp lowers the final headcount', () => {
    openFixture('ramps-slow');
    render(<Compare />);
    expect(Number(cell('Final headcount (FTE)', 3))).toBeGreaterThan(3.8);
  });
});
