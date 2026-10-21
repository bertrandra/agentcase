// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import Eligibility from '@/ui/sections/tune/eligibility';
import { freshStore } from '../../store/helpers';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { loadFixture } from '../../helpers/tuneA';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const state = () => appStore().getState().doc;
const calc = () => computeCase(state());
const text = (c: HTMLElement) => renderedText(c).replace(/\s+/g, ' ');
const spec = 'Clear & stable specifications';

describe('eligibility section', () => {
  it.each(['golden', 'ctx-msi', 'curve-logistic', 'industry-med'])('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<Eligibility />);
    expect(missingNumbers(legacySectionText(fx, 'eligibility')!, renderedText(container))).toEqual([]);
  });
  it('the gate: prerequisites, codebase size and delivery nature drive the verdict (informative: euros do not move); undo', () => {
    const { container } = render(<Eligibility />);
    const sav = calc().model.yearSav;
    expect(text(container)).toMatch(/GO — eligible/);
    fireEvent.change(screen.getByLabelText(spec), { target: { value: 'unmet' } });
    expect(state().dom.values.elPre_spec).toBe('unmet');
    expect(text(container)).toMatch(/NO-GO — not globally eligible/);
    expect(text(container)).toMatch(/Clear & stable specifications \(critical\) not met/);
    fireEvent.change(screen.getByLabelText(spec), { target: { value: 'partial' } });
    expect(text(container)).toMatch(/CONDITIONAL — eligible per task, close the gaps/);
    fireEvent.change(screen.getByLabelText('Open & collaborative client'), { target: { value: 'unmet' } });
    expect(text(container)).toMatch(/Open & collaborative client not met/);
    fireEvent.change(screen.getByLabelText('Codebase size (kLoC)'), { target: { value: '600' } });
    expect(text(container)).toMatch(/Codebase > 500k LoC/);
    expect(text(container)).toMatch(/NO-GO/);
    fireEvent.change(screen.getByLabelText('Delivery nature'), { target: { value: 'sovereign' } });
    expect(text(container)).toMatch(/Sovereign\/air-gap hardens prerequisites/);
    expect(calc().model.yearSav).toEqual(sav);
    act(() => { appStore().undo(); });
    expect(state().dom.values.elNature).toBe('standard');
  });
  it('the product profile is the lifecycle position: the matrix marks it and the economics follow', () => {
    const { container } = render(<Eligibility />);
    const sav = calc().model.yearSav[2] as number;
    expect(text(container)).toMatch(/Feature add ◀/);
    fireEvent.change(screen.getByLabelText(/^Product profile/), { target: { value: 'modernisation' } });
    expect(state().lifecyclePos).toBe(75);
    expect(text(container)).toMatch(/Modernisation ◀/);
    expect(calc().model.yearSav[2]).not.toBe(sav);
    act(() => { appStore().undo(); });
    expect(state().lifecyclePos).toBe(25);
    expect(calc().model.yearSav[2]).toBe(sav);
  });
  it('Abaque table: pillar leverage, verification tax and the two cases read the case', () => {
    const { container } = render(<Eligibility />);
    expect(text(container)).toMatch(/Abaque B \(maturity capture at L\s*4\s*=\s*88\s*%\s*\)/);
    expect(text(container)).toMatch(/V3 Implementation \( Coding \) 45% — 39% — 39%/);
    expect(text(container)).toMatch(/informative only/);
    fireEvent.click(screen.getByLabelText('Apply pillar leverage to the Abaque reconciliation'));
    expect(text(container)).toMatch(/× pillar leverage/);
    expect(text(container)).toMatch(/V1 Specification \( Plan \/ Analyse \) 13% ×0\.70 8%/);
    const sav = calc().model.yearSav[2] as number;
    fireEvent.click(screen.getByLabelText(/Deduct the verification tax from savings/));
    expect(calc().model.yearSav[2]).toBeLessThan(sav);                                  // the tax is charged to the economics
    expect(text(container)).toMatch(/APPLIED/);
    expect(text(container)).toMatch(/Case 1 — Overlay: on top of retained supervision \(conservative\)\. Rate = base\s*30\s*%/);
    expect(text(container)).toMatch(/−\d+ pts/);
    fireEvent.change(screen.getByLabelText('Tax mode'), { target: { value: 'net' } });
    expect(text(container)).toMatch(/Case 2 — Net of retained supervision \(precise\)\. The review need is\s*30\s*%/);
    const rate = calc().model.conv.vTaxRate;
    fireEvent.change(screen.getByLabelText('Verification-tax base (×human sup.)'), { target: { value: '0.5' } });
    expect(calc().model.conv.vTaxRate).toBeGreaterThan(rate);
  });
  it('the hard cap is a coefficient of the case (COEF + form value) and bounds the rate', () => {
    render(<Eligibility />);
    fireEvent.click(screen.getByLabelText(/Deduct the verification tax from savings/));
    fireEvent.change(screen.getByLabelText('Verification-tax base (×human sup.)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Verification-tax hard cap'), { target: { value: '0.05' } });
    expect(state().COEF.vtaxCap).toBe(0.05);
    expect(state().dom.values.vtaxCapCoef).toBe('0.05');
    expect(calc().model.conv.vTaxRate).toBeCloseTo(0.05, 9);
    act(() => { appStore().undo(); });
    expect(state().COEF.vtaxCap).toBe(0.6);
  });
});
