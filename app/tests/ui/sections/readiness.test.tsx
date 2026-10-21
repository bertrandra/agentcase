// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import Readiness from '@/ui/sections/tune/readiness';
import { freshStore } from '../../store/helpers';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { loadFixture } from '../../helpers/tuneA';

beforeEach(() => {
  freshStore();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);                       // jsdom has no canvas: Chart.js logs, ChartPanel tolerates
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(cleanup);
const state = () => appStore().getState().doc;
const calc = () => computeCase(state());
const text = (c: HTMLElement) => renderedText(c).replace(/\s+/g, ' ');
const answers = () => (state() as unknown as { readinessAns: Record<string, (number | null)[]> }).readinessAns;
const assess = () => fireEvent.click(screen.getByRole('tab', { name: 'Assessment questionnaire' }));
const Q = 'An executive sponsor is identified and active';

describe('readiness section', () => {
  it.each(['golden', 'ctx-msi', 'curve-logistic', 'industry-med'])('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<Readiness />);
    expect(missingNumbers(legacySectionText(fx, 'readiness')!, renderedText(container))).toEqual([]);
  });
  it('Human Readiness: the switch feeds the model (change cost + adoption drag), the read-out says so, undo restores', () => {
    const { container } = render(<Readiness />);
    const off = calc().model;
    expect(text(container)).toMatch(/Status in the model\s+informative only — enable above/);
    fireEvent.click(screen.getByLabelText(/Enable Human Readiness in the model/));
    const on = calc().model;
    expect(state().dom.checked.hriEnabled).toBe(true);
    expect(on.conv.hriOn).toBe(true);
    expect(on.conv.changeCost).toBeCloseTo(15 * 3000, 6);
    expect(on.yearSav[2]).toBeLessThan(off.yearSav[2] as number);
    expect(text(container)).toMatch(/APPLIED \(setup \+ ramp\)/);
    act(() => { appStore().undo(); });
    expect(calc().model.yearSav[2]).toBe(off.yearSav[2]);
  });
  it('a question answer moves the index, the intensity band and the engine\'s readiness figures', () => {
    const { container } = render(<Readiness />);
    fireEvent.click(screen.getByLabelText(/Enable Human Readiness/));
    expect(text(container)).toMatch(/50\/100 · Fragile/);
    fireEvent.change(screen.getByLabelText(Q), { target: { value: '0' } });
    expect(state().dom.values.hriQ0).toBe('0');
    expect(text(container)).toMatch(/47\/100 · At risk/);
    expect(text(container)).toMatch(/Change intensity\s+intensive/);
    expect(calc().model.conv.hri).toBe(47);
    expect(calc().model.conv.changeCost).toBeCloseTo(15 * 5500, 6);
    fireEvent.change(screen.getByLabelText(Q), { target: { value: '4' } });
    expect(text(container)).toMatch(/53\/100 · Fragile/);
  });
  it('change-cost grid and drag coefficients are inputs of the case (COEF + form value move together)', () => {
    const { container } = render(<Readiness />);
    fireEvent.click(screen.getByLabelText(/Enable Human Readiness/));
    fireEvent.change(screen.getByLabelText('Standard (50–74)'), { target: { value: '3500' } });
    expect(calc().model.conv.changeCost).toBeCloseTo(15 * 3500, 6);
    expect(text(container)).toMatch(/× €\s*3,500/);
    expect(text(container)).toMatch(/× 0\.80/);
    fireEvent.change(screen.getByLabelText('Ramp floor'), { target: { value: '0.5' } });
    expect(state().COEF.hriFloor).toBe(0.5);
    expect(state().dom.values.hriFloorCoef).toBe('0.5');
    expect(text(container)).toMatch(/× 0\.70/);
    expect(calc().model.conv.hriF).toBeCloseTo(0.7, 9);
    fireEvent.change(screen.getByLabelText('Ramp floor'), { target: { value: '' } });     // not a number: ignored like coefSet()
    expect(state().COEF.hriFloor).toBe(0.5);
  });
  it('assessment: answers, bulk buttons, index, band, radar and weakest areas; undo', () => {
    const { container } = render(<Readiness />);
    assess();
    expect(text(container)).toMatch(/— Not assessed/);
    fireEvent.change(screen.getByLabelText('Requirements, designs and APIs are documented in a consistent, discoverable format'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Security is integrated in the SDLC (SAST/DAST, secure coding)'), { target: { value: '0' } });
    expect(answers().doc).toEqual([100, null, null]);
    expect(text(container)).toMatch(/50 Developing/);
    expect(text(container)).toMatch(/Priority pre-requisites: Security \(0\), Documentation \(100\)/);
    expect(container.querySelector('canvas[aria-label]')).toBeTruthy();
    fireEvent.click(screen.getByText('All Yes'));
    expect(text(container)).toMatch(/100 Leading/);
    fireEvent.click(screen.getByText('All No'));
    expect(text(container)).toMatch(/0 Nascent/);
    fireEvent.click(screen.getByText('All Partial'));
    expect(text(container)).toMatch(/50 Developing/);
    fireEvent.click(screen.getByText('Reset'));
    expect(answers().doc).toEqual([null, null, null]);
    expect(text(container)).toMatch(/— Not assessed/);
    act(() => { appStore().undo(); });
    expect(answers().sec).toEqual([50, 50, 50]);
  });
});
