// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { setChecked, setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Maturity from '@/ui/sections/tune/maturity';
import { freshStore } from '../../store/helpers';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { loadFixture } from '../../helpers/tuneA';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const state = () => appStore().getState().doc;
const calc = () => computeCase(state());
const text = (c: HTMLElement) => renderedText(c).replace(/\s+/g, ' ');
const yearCost = (c: HTMLElement, y: number) => parseFloat(/Y1 ≈ €[\d,]+K/.test(text(c)) ? (new RegExp(`Y${y} ≈ €([\\d,]+)K/yr`).exec(text(c))?.[1] ?? 'NaN').replace(',', '') : 'NaN');

describe('maturity section', () => {
  it.each(['golden', 'ctx-msi', 'curve-logistic', 'industry-med'])('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<Maturity />);
    expect(missingNumbers(legacySectionText(fx, 'maturity')!, renderedText(container))).toEqual([]);
  });
  it('SDD maturity edits the document, names the level and cuts the verification tax in the economics; undo restores', () => {
    setChecked('vtaxApply', true);                       // the tax is only charged when the Eligibility switch is on
    const { container } = render(<Maturity />);
    const rate0 = calc().model.conv.vTaxRate, sav0 = calc().model.yearSav[2] as number;
    expect(text(container)).toMatch(/0\/100 · Vibe coding/);
    fireEvent.change(screen.getByLabelText(/^SDD maturity \(0–100\)/), { target: { value: '60' } });
    expect(state().dom.values.sddMat).toBe('60');
    expect(text(container)).toMatch(/60\/100 · Spec-first/);
    expect(text(container)).toMatch(/−30%\s*Verification-tax reduction/);
    expect(calc().model.conv.vTaxRate).toBeCloseTo(rate0 * 0.7, 9);          // base x (1 - 0.5 x SDD)
    expect(calc().model.yearSav[2]).toBeGreaterThan(sav0);
    act(() => { appStore().undo(); });
    expect(state().dom.values.sddMat).toBe('0');
    expect(calc().model.conv.vTaxRate).toBeCloseTo(rate0, 9);
  });
  it('harness readiness is shown and kept in the document (analytical: the euro result does not move)', () => {
    const { container } = render(<Maturity />);
    const sav0 = calc().model.yearSav[2];
    fireEvent.change(screen.getByLabelText(/^Agent-stack \/ harness readiness/), { target: { value: '35' } });
    expect(state().dom.values.harnessMat).toBe('35');
    expect(text(container)).toMatch(/35\/100\s*Harness readiness/);
    expect(calc().model.yearSav[2]).toBe(sav0);
  });
  it('the coaching curve follows the Y1 and cruise loads (Y2 is mid-way) and prices them on the AS-IS team', () => {
    const { container } = render(<Maturity />);
    expect(yearCost(container, 1)).toBeGreaterThan(0);
    const y1 = yearCost(container, 1), y3 = yearCost(container, 3);
    fireEvent.change(screen.getByLabelText('Y1 coaching load (% capacity)'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Cruise coaching load (%)'), { target: { value: '10' } });
    expect(text(container)).toMatch(/60%\s*Y1 coaching load/);
    expect(text(container)).toMatch(/35%\s*Y2 coaching load/);
    expect(text(container)).toMatch(/10%\s*Y3 coaching load/);
    expect(yearCost(container, 1)).toBeCloseTo((y1 * 60) / 40, -1);
    expect(yearCost(container, 3)).toBeCloseTo((y3 * 10) / 20, -1);
    expect(text(container)).toMatch(/starts at ~\s*60\s*% of capacity and decays to ~\s*10\s*% at cruise/);
  });
  it('the measurement socle reads the verification tax and the Human Readiness index from the model', () => {
    const { container } = render(<Maturity />);
    expect(text(container)).toMatch(/\(EV-27\)\s+PR cycle time/);
    act(() => { setChecked('vtaxApply', true); setInput('hriQ0', 4); });
    expect(text(container)).toMatch(/\(EV-27\) ≈ \d+%/);
    expect(text(container)).toMatch(/HRI 53\/100/);
    expect(text(container)).toMatch(/DORA alone is no longer enough at L\s*4/);
    expect(screen.getAllByRole('row').length).toBeGreaterThan(25);              // DORA 4 + SPACE 4 + AI 5 + human 3 + tiers 4 + gates 6
  });
});
