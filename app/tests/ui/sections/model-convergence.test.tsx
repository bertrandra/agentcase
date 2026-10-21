// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/model-engine/convergence';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const calc = () => computeCase(doc());

describe('model-convergence section (P1 loop convergence economics)', () => {
  it.each([...PARITY_FIXTURES, ...['me-lce', 'me-sup-hard', 'me-mcs']])('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'model-convergence');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('previews the calibrated loops with the phase off, and Enable P1 switches it on without moving a euro', () => {
    render(<Section />);
    expect(screen.getByText(/Weighted E\[N\]/).textContent).toMatch(/2\.00 · escape 8\.7%/);
    const before = calc().model.yearSav;
    fireEvent.click(screen.getByText('Enable P1'));
    expect(doc().MODEL.FLAGS.lce).toBe(true);
    expect(doc().MODEL.LCE.loops).toHaveLength(3);
    expect(screen.getByText('Disable P1')).toBeTruthy();
    expect(calc().model.yearSav).toEqual(before);   // display-only by construction
    act(() => { appStore().undo(); });
    expect(doc().MODEL.FLAGS.lce).toBe(false);
  });
  it('editing p moves E[N], the escape rate and — through the verification tax of a regulated scope — the savings; undo restores them', () => {
    loadFixture('evt-reg');   // regulated scope with the endogenous verification tax charged
    render(<Section />);
    fireEvent.click(screen.getByText('Enable P1'));
    const savings = calc().model.yearSav[2] as number, line = () => screen.getByText(/Weighted E\[N\]/).textContent;
    const was = line();
    fireEvent.change(screen.getByLabelText('p of Code ↔ Unit tests'), { target: { value: '0.95' } });
    fireEvent.change(screen.getByLabelText('p of Code ↔ Code review'), { target: { value: '0.95' } });
    expect(doc().MODEL.LCE.loops[0]!.pAccept).toBe(0.95);
    expect(line()).not.toBe(was);
    expect(calc().model.yearSav[2]).toBeGreaterThan(savings + 1000);   // more reliable agents -> a smaller marginal verification tax
    act(() => { appStore().undo(); appStore().undo(); });
    expect(calc().model.yearSav[2]).toBeCloseTo(savings, 6);
    expect(line()).toBe(was);
  });
  it('review time, iteration cap and fallback cost edit the case (clamped); Recalibrate re-solves p and says so', () => {
    render(<Section />);
    fireEvent.click(screen.getByText('Enable P1'));
    fireEvent.change(screen.getByLabelText('p of Code ↔ Code review'), { target: { value: '0.7' } });
    fireEvent.change(screen.getByLabelText('Review time of Code ↔ Unit tests'), { target: { value: '2' } });
    expect(doc().MODEL.LCE.loops[0]!.tRev).toBe(2);
    fireEvent.change(screen.getByLabelText('Iteration cap nmax'), { target: { value: '8' } });
    expect(doc().MODEL.LCE.nMax).toBe(8);
    fireEvent.change(screen.getByLabelText('Fallback cost / escape (€)'), { target: { value: '800' } });
    expect(doc().MODEL.LCE.fallbackCost).toBe(800);
    fireEvent.click(screen.getByText('↻ Recalibrate p'));
    expect(doc().MODEL.LCE.loops[1]!.pAccept).not.toBe(0.7);
    expect(doc().MODEL.LCE.loops[0]!.tRev).toBe(0);   // recalibration rebuilds the loops: review times start again from 0
  });
});
