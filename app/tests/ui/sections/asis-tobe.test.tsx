// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import AsisTobe from '@/ui/sections/verify/asis-tobe';
import { bodies, legacyDom, loadFixture, PARITY_FIXTURES, parityGaps, VB_FIXTURES } from '../../helpers/verifyB';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('asis-tobe section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<AsisTobe />);
    expect(parityGaps(id, 'asis-tobe', container)).toEqual([]);
  });
  it.each(VB_FIXTURES)('reproduces the legacy comparison table cell by cell (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<AsisTobe />);
    expect(bodies(container)[0]).toEqual(legacyDom(id).asis.slice(1));
  });
  it('the TO-BE column is labelled with the horizon end', () => {
    const { container } = render(<AsisTobe />);
    act(() => setInput('horizon', 7));
    expect([...container.querySelectorAll('th')].map((h) => h.textContent)).toEqual(['Metric', 'AS-IS', 'TO-BE Y7', 'Difference']);
  });
  it('an automation edit changes the human effort; undo restores it', () => {
    const { container } = render(<AsisTobe />), effort = () => bodies(container)[0]![1]![2];
    const before = effort();
    act(() => setInput('y3Ramp', 40));
    expect(effort()).not.toBe(before);
    act(() => appStore().undo());
    expect(effort()).toBe(before);
  });
});
