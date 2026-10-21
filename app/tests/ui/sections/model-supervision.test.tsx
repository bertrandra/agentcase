// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/model-engine/supervision';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);
const doc = () => appStore().getState().doc;
const model = () => computeCase(doc()).model;
const undo = (n = 1) => act(() => { for (let i = 0; i < n; i++) appStore().undo(); });

describe('model-supervision section (P3 supervision, provisioned or constrained)', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'model-supervision');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('Enable P3 (provisioned) changes no euro; the capacity table reads the model', () => {
    loadFixture('golden');
    const before = model().yearSav;
    render(<Section />);
    fireEvent.click(screen.getByText('Enable P3'));
    expect(doc().MODEL.FLAGS.sup).toBe(true);
    expect(model().yearSav).toEqual(before);
    expect(screen.getByText(/ON — Provisioned/, { selector: 'strong' })).toBeTruthy();
    undo();
    expect(doc().MODEL.FLAGS.sup).toBe(false);
  });
  it('switching to Constrained seeds the non-binding headcount; dialling it down caps the agent capacity and the savings follow; undo restores them', () => {
    loadFixture('golden');
    const base = model();
    render(<Section />);
    fireEvent.click(screen.getByText('Enable P3'));
    fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'constrained' } });
    expect(doc().MODEL.SUP.provision).toBe('constrained');
    expect(doc().MODEL.SUP.supervisors).toBe(3);   // ceil(2.29): today's requirement, so the switch-on is neutral
    expect(model().yearSav[2]).toBeCloseTo(base.yearSav[2] as number, 6);
    fireEvent.change(screen.getByLabelText('Supervisors (FTE)'), { target: { value: '1.5' } });
    expect(model().yearAgentVfte[2]).toBeLessThan(base.yearAgentVfte[2] as number);
    expect(model().yearSav[2]).toBeLessThan(base.yearSav[2] as number);
    expect(screen.getAllByText(/\d+%/).length).toBeGreaterThan(0);   // utilisation column
    fireEvent.change(screen.getByLabelText('Cap sub-mode'), { target: { value: 'soft' } });
    expect(doc().MODEL.SUP.mode).toBe('soft');
    fireEvent.change(screen.getByLabelText('Ramp λ (/yr)'), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText('Ramp cap (×)'), { target: { value: '3' } });
    expect(doc().MODEL.SUP.rampRate).toBe(0.2);
    expect(doc().MODEL.SUP.rampCap).toBe(3);
    undo(5);
    expect(model().yearSav[2]).toBeCloseTo(base.yearSav[2] as number, 6);
    expect(doc().MODEL.SUP.provision).toBe('provisioned');
  });
  it('the day-rate override and the measured DORA values are case edits (undoable)', () => {
    loadFixture('golden');
    render(<Section />);
    fireEvent.change(screen.getByLabelText('Day-rate override (€, 0=use blended)'), { target: { value: '90000' } });
    expect(doc().MODEL.SUP.supervisorCost).toBe(90000);
    fireEvent.change(screen.getByLabelText('Measured Deployment frequency'), { target: { value: '70000' } });
    expect((doc().MODEL as unknown as { DORA: { measured: Record<string, number> } }).DORA.measured.deployFreq).toBe(70000);
    expect(screen.getByText(/Δ \+/)).toBeTruthy();   // measured above the derived 61 875
    undo();
    expect(screen.queryByText(/Δ \+/)).toBeNull();
  });
});
