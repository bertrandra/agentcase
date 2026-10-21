// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appStore } from '@/store/instance';
import Velocity from '@/ui/sections/verify/velocity';
import { bodies, legacyDom, loadFixture, PARITY_FIXTURES, parityGaps, VB_FIXTURES } from '../../helpers/verifyB';
import { freshStore } from '../../store/helpers';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));
beforeEach(() => { freshStore(); });
afterEach(cleanup);

const field = (c: Element, id: string) => c.querySelector<HTMLInputElement>(`#${id}`)!;
describe('velocity section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Velocity />);
    expect(parityGaps(id, 'velocity', container)).toEqual([]);
  });
  it.each(VB_FIXTURES)('reproduces the legacy DORA table and the coefficient fields (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Velocity />);
    expect(bodies(container)[0]).toEqual(legacyDom(id).dora.slice(1));
    expect([field(container, 'veloPerfRelCap').value, field(container, 'veloPerfUpliftFactor').value]).toEqual(
      [appStore().getState().doc.COEF.perfRelCap, appStore().getState().doc.COEF.perfUpliftFactor].map(String));
  });
  it('the realisation cap and the uplift factor edit COEF, move the DORA table, and undo restores them', () => {
    const { container } = render(<Velocity />), table = () => JSON.stringify(bodies(container)[0]);
    const before = table();
    fireEvent.change(field(container, 'veloPerfRelCap'), { target: { value: '0.5' } });
    expect(appStore().getState().doc.COEF.perfRelCap).toBe(0.5);
    const capped = table();
    expect(capped).not.toBe(before);
    fireEvent.change(field(container, 'veloPerfUpliftFactor'), { target: { value: '0.4' } });
    expect(appStore().getState().doc.COEF.perfUpliftFactor).toBe(0.4);
    expect(table()).not.toBe(capped);
    act(() => { appStore().undo(); appStore().undo(); });
    expect([table(), appStore().getState().doc.COEF.perfRelCap, appStore().getState().doc.COEF.perfUpliftFactor]).toEqual([before, 1.4, 0.85]);
  });
  it('a value that is not a number is kept in the field but never reaches COEF', () => {
    const { container } = render(<Velocity />);
    fireEvent.change(field(container, 'veloPerfRelCap'), { target: { value: '' } });
    expect(appStore().getState().doc.COEF.perfRelCap).toBe(1.4);
  });
  it('the velocity chart has four points Y0 to the horizon end', () => {
    const { container } = render(<Velocity />);
    expect([container.querySelector('canvas')!.dataset.points]).toEqual(['4']);
  });
});
