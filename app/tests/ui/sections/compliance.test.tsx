// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Compliance from '@/ui/sections/verify/compliance';
import { statsOf } from '../../helpers/economics';
import { bodies, legacyDom, loadFixture, PARITY_FIXTURES, parityGaps, VB_FIXTURES } from '../../helpers/verifyB';
import { freshStore } from '../../store/helpers';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));
beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('compliance section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Compliance />);
    expect(parityGaps(id, 'compliance', container)).toEqual([]);
  });
  it.each(VB_FIXTURES)('reproduces the legacy cards and the sector table cell by cell (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Compliance />), L = legacyDom(id);
    expect(bodies(container)[0]).toEqual(L.comp.slice(1));
    expect(statsOf(container).map((s) => [s[0], s[1]])).toEqual(L.compCards.map((c) => [c[0]!.toUpperCase(), c[1]!]));
  });
  it('the chart has one bar per sector for the two series', () => {
    const { container } = render(<Compliance />), c = container.querySelector('canvas')!;
    expect([c.dataset.points, c.dataset.series]).toEqual(['12', 'Max automatable %:12,Glass ceiling %:12']);
  });
  it('picking an industry marks its row and moves the ceiling cards; undo restores', () => {
    const { container } = render(<Compliance />), marked = () => [...container.querySelectorAll('tbody tr')].filter((r) => r.textContent!.includes('◄')).map((r) => r.children[0]!.textContent);
    expect(marked()).toEqual(['None ◄']);
    act(() => setInput('industry', 'MED'));
    expect(marked()).toEqual(['Medical (MD / IVD) ◄']);
    expect(statsOf(container)[0]).toEqual(['INDUSTRY', 'MED']);
    act(() => appStore().undo());
    expect(marked()).toEqual(['None ◄']);
  });
});
