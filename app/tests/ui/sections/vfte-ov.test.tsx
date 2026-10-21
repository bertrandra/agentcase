// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import { selectAllPhases } from '@/controllers/scope';
import VfteOv from '@/ui/sections/verifyA/vfte-ov';
import { freshStore } from '../../store/helpers';
import { parityTests } from '../../helpers/verifyA';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const cells = (c: HTMLElement, t: number) => [...c.querySelectorAll('table')[t]!.querySelectorAll('tbody tr')].map((r) => [...r.children].map((x) => x.textContent));

describe('vfte-ov section', () => {
  parityTests('vfte-ov', VfteOv);
  it('the period table follows the Y3 ramp; undo restores it', () => {
    const { container } = render(<VfteOv />), before = cells(container, 0);
    expect(before[before.length - 1]).toEqual(['Y3', '3.8', '11.3', '15.0', '100%', '11.3 FTE']);
    act(() => setInput('y3Ramp', 40));
    expect(cells(container, 0).slice(-1)[0]![5]).not.toBe('11.3 FTE');
    act(() => appStore().undo());
    expect(cells(container, 0)).toEqual(before);
  });
  it('the category table follows the scope', () => {
    const { container } = render(<VfteOv />);
    expect(cells(container, 1).map((r) => r[0])).toEqual(['NVA-N', 'VA', 'NVA']);
    act(() => selectAllPhases(true));
    expect(cells(container, 1).reduce((s, r) => s + Number(r[1]), 0)).toBe(53);
    act(() => selectAllPhases(false));
    expect(cells(container, 1).reduce((s, r) => s + Number(r[1]), 0)).toBe(4);
  });
});
