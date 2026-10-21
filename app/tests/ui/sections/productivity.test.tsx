// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { togglePhase } from '@/controllers/scope';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Productivity from '@/ui/sections/verify/productivity';
import { bodies, legacyDom, loadFixture, PARITY_FIXTURES, parityGaps, VB_FIXTURES } from '../../helpers/verifyB';
import { freshStore } from '../../store/helpers';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));
beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('productivity section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Productivity />);
    expect(parityGaps(id, 'productivity', container)).toEqual([]);
  });
  it.each(VB_FIXTURES)('reproduces the legacy throughput rows and scope note (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Productivity />), legacy = legacyDom(id).prod.slice(1);
    expect(bodies(container)[0]).toEqual(legacy.slice(1));
    expect(container.textContent).toContain(legacy[0]![0]);
  });
  it('with no throughput category in scope, all categories are shown (fallback note)', () => {
    loadFixture('vb-scope-l0');
    const { container } = render(<Productivity />);
    expect(bodies(container)[0]).toHaveLength(6);
    expect(container.textContent).toContain('maps to no standard throughput category');
  });
  it('changing the scope or the ramp changes the throughput; undo restores it', () => {
    const { container } = render(<Productivity />), rows = () => JSON.stringify(bodies(container)[0]);
    const before = rows();
    act(() => setInput('y3Ramp', 50));
    expect(rows()).not.toBe(before);
    act(() => togglePhase('V2', true));
    expect(container.querySelectorAll('tbody tr').length).toBe(5);
    act(() => { appStore().undo(); appStore().undo(); });
    expect(rows()).toBe(before);
  });
});
