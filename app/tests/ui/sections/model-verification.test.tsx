// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { computeCase, makeCtx } from '@/domain';
import { evtModel } from '@/domain/model/evt';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/model-engine/verification';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);
const doc = () => appStore().getState().doc;
const sav = () => computeCase(doc()).model.yearSav[2] as number;
const undo = (n = 1) => act(() => { for (let i = 0; i < n; i++) appStore().undo(); });

describe('model-verification section (P2 verification tax by criticality class)', () => {
  it.each([...PARITY_FIXTURES, ...['me-lce', 'me-evt-direct']])('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'model-verification');
    expect(legacy).not.toBeNull();
    // 10100 = the legacy text '10<TAB>100.0%' (artefact count, then its scope share) read as one number by the tolerant parser
    expect(missingNumbers(legacy!, renderedText(container), [10100])).toEqual([]);
  });
  it('previews the class table with the phase off, then Enable P2 charges the derived tax (undo restores the flat one)', () => {
    loadFixture('industry-med');
    const { container } = render(<Section />);
    expect(screen.getByText(/Phase/).textContent).toMatch(/OFF/);
    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(1);   // C0 plus the regulated classes of the scope
    fireEvent.click(screen.getByText('Enable P2'));
    expect(doc().MODEL.FLAGS.evt).toBe(true);
    expect(screen.getByText('Disable P2')).toBeTruthy();
    expect(screen.getByText(/not yet charged to the case/)).toBeTruthy();   // the legacy "deduct the tax" box is off in this case
    undo();
    expect(doc().MODEL.FLAGS.evt).toBe(false);
  });
  it('reliability source and direct r move the tax and therefore the savings; undo restores them', () => {
    loadFixture('evt-reg');
    render(<Section />);
    const base = sav();
    fireEvent.change(screen.getByLabelText('Reliability source'), { target: { value: 'direct' } });
    expect(doc().MODEL.EVT.rSource).toBe('direct');
    fireEvent.change(screen.getByLabelText('r (direct)'), { target: { value: '0.99' } });
    expect(doc().MODEL.EVT.rDirect).toBe(0.99);
    expect(sav()).toBeGreaterThan(base + 1000);   // a near-perfect agent leaves almost no marginal verification
    undo(2);
    expect(sav()).toBeCloseTo(base, 6);
  });
  it('net mode credits the supervision already retained', () => {
    loadFixture('evt-reg');
    render(<Section />);
    const base = sav();
    fireEvent.change(screen.getByLabelText('Tax mode'), { target: { value: 'net' } });
    expect(doc().MODEL.EVT.mode).toBe('net');
    expect(sav()).toBeGreaterThan(base);
    undo();
    expect(sav()).toBeCloseTo(base, 6);
  });
  it('a negative net tax is a savings credit that needs the explicit acknowledgement (CC-VT-02)', () => {
    loadFixture('evt-net');   // net mode with the negative tax acknowledged
    render(<Section />);
    const credited = sav(), box = screen.getByLabelText(/I acknowledge this explicit claim/) as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(doc().MODEL.EVT.ackNegativeNet).toBe(false);
    expect(sav()).toBeLessThan(credited);   // unacknowledged, the negative tax is clamped to 0: no credit
    undo();
    expect(sav()).toBeCloseTo(credited, 6);
  });
  it('the floor, intensity and stiffness of a class are editable when the phase is on and raise the ceiling gap', () => {
    loadFixture('evt-reg');
    const { container } = render(<Section />);
    const e0 = evtModel(makeCtx(doc()));
    fireEvent.change(screen.getByLabelText('φ of C0'), { target: { value: '0.3' } });
    expect(doc().MODEL.EVT.phiTable.C0).toBe(0.3);
    expect(evtModel(makeCtx(doc())).phiWeighted).toBeGreaterThan(e0.phiWeighted);
    fireEvent.change(screen.getByLabelText('κ of C0'), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText('γ of C0'), { target: { value: '9' } });   // above the bound: blur commits, the controller clamps to 4
    fireEvent.blur(screen.getByLabelText('γ of C0'));
    expect(doc().MODEL.EVT.kappa.C0).toBe(0.5);
    expect(doc().MODEL.EVT.gamma.C0).toBe(4);
    const e1 = evtModel(makeCtx(doc()));
    expect(renderedText(container)).toContain(`${((1 - e1.phiWeighted) * 100).toFixed(1)}%`);   // the ceiling tile follows the edit
  });
});
