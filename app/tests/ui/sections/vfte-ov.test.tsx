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
const cells = (c: HTMLElement, t: number) =>
  [...c.querySelectorAll('table')[t]!.querySelectorAll('tbody tr')].map((r) => [...r.children].map((x) => x.textContent));

/** the legacy "Y1 Q1-Q2" ramp of golden, 13 % = half of the Y1 end adoption (v19: the engine adoption at month 6) */
const IGNORE = [13];

describe('vfte-ov section', () => {
  // DEV-FTE-ONE-DEF: the period table reads the Time Engine (month 6 for Y1 Q1-Q2) and the FTE owner's freed capacity, its ramp column is "Adoption %"
  // (it never was the automation); asserted in tests/domain/lot10-sot.test.ts.
  parityTests('vfte-ov', VfteOv, { skip: [0], ignore: IGNORE });
  it('the period table follows the Y3 ramp; undo restores it', () => {
    const { container } = render(<VfteOv />), before = cells(container, 0);
    expect(before[before.length - 1]).toEqual(['Y3', '3.8', '11.3', '15.0', '100%', '9.0 FTE']);
    act(() => setInput('y3Ramp', 40));
    expect(cells(container, 0).slice(-1)[0]![5]).not.toBe('9.0 FTE');
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
