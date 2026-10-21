// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Exec from '@/ui/sections/verify/exec';
import { bodies, legacyDom, loadFixture, PARITY_FIXTURES, parityGaps, VB_FIXTURES } from '../../helpers/verifyB';
import { freshStore } from '../../store/helpers';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));
beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('exec section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Exec />);
    expect(parityGaps(id, 'exec', container)).toEqual([]);
  });
  it.each(VB_FIXTURES)('reproduces the legacy phase table cell by cell (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Exec />);
    expect(bodies(container)[0]).toEqual(legacyDom(id).exec.slice(1));
  });
  it('the sprint chart has the four year series; the terminal column follows the horizon', () => {
    const { container } = render(<Exec />);
    expect(container.querySelector('canvas')!.dataset.series).toBe('AS-IS:8,Y1:8,Y2:8,Y3:8');
    act(() => setInput('horizon', 5));
    expect(container.querySelector('canvas')!.dataset.series).toBe('AS-IS:8,Y1:8,Y2:8,Y5:8');
    expect(container.querySelectorAll('th')[4]!.textContent).toBe('Y5');
  });
  it('an automation ramp edit changes the durations; undo restores them', () => {
    const { container } = render(<Exec />), y1 = () => bodies(container)[0]![2]![2];
    const before = y1();
    act(() => setInput('y1Ramp', 60));
    expect(y1()).not.toBe(before);
    act(() => appStore().undo());
    expect(y1()).toBe(before);
  });
});
