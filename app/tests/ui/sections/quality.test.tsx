// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appStore } from '@/store/instance';
import Quality from '@/ui/sections/verify/quality';
import { bodies, legacyDom, loadFixture, PARITY_FIXTURES, parityGaps, VB_FIXTURES } from '../../helpers/verifyB';
import { freshStore } from '../../store/helpers';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));
beforeEach(() => { freshStore(); });
afterEach(cleanup);

const inputs = (c: Element) => [...c.querySelectorAll<HTMLInputElement>('tbody input')].map((i) => i.value);
describe('quality section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Quality />);
    expect(parityGaps(id, 'quality', container)).toEqual([]);
  });
  it.each(VB_FIXTURES)('reproduces the legacy table (Y1..Y3, targets) and the editable fields (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Quality />), L = legacyDom(id);
    expect(bodies(container)[0]!.map((r) => [r[0], r[2], r[3], r[4]!.replace(/target$/, ' target')])).toEqual(L.qual.slice(1).map((r) => [r[0], r[2], r[3], r[4]]));
    expect(inputs(container)).toEqual(L.qualInputs);
  });
  it('editing the AS-IS baseline and the target moves Y1..Y3 and the radar; Reset AS-IS and undo restore them', () => {
    const { container } = render(<Quality />), row = () => bodies(container)[0]![1]!;
    const before = row();
    fireEvent.change(screen.getByLabelText('Test coverage AS-IS'), { target: { value: '50' } });
    expect(row()[2]).not.toBe(before[2]);
    fireEvent.change(screen.getByLabelText('Test coverage target'), { target: { value: '99' } });
    expect(row()[4]).toContain('99');
    expect((appStore().getState().doc.QUALITY as unknown[][])[1]).toEqual(['Test coverage', 50, 99, 'Jest']);
    fireEvent.click(screen.getByText('↺ Reset AS-IS'));
    expect(row()).toEqual(before);
    act(() => appStore().undo());
    expect(row()[4]).toContain('99');
    act(() => { appStore().undo(); appStore().undo(); });
    expect(row()).toEqual(before);
  });
  it('an edited value is flagged (amber) and a non-number is ignored', () => {
    const { container } = render(<Quality />), asis = () => screen.getByLabelText('Doc sync % AS-IS') as HTMLInputElement;
    expect(asis().style.fontWeight).toBe('var(--ac-font-weight-regular)');   // theme token (400)
    fireEvent.change(asis(), { target: { value: '60' } });
    expect(asis().style.fontWeight).toBe('var(--ac-font-weight-bold)');   // theme token (700)
    fireEvent.change(asis(), { target: { value: '' } });
    expect((appStore().getState().doc.QUALITY as unknown[][])[4]![1]).toBe(60);
    expect(container.querySelector('canvas')!.dataset.series).toBe('AS-IS:7,TO-BE Y3:7');
  });
});
