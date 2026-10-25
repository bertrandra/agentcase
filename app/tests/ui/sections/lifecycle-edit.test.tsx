// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import LifecycleEdit from '@/ui/sections/tune/lifecycle-edit';
import { freshStore } from '../../store/helpers';
import { expectParity, FIXTURES, loadFixture } from './tuneBHelpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const growth = () => doc().statusLifecycle.find((s) => s.id === 'growth')!;
const sav = () => computeCase(doc()).model.yearSav;

describe('lifecycle-edit section', () => {
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<LifecycleEdit />);
    expectParity(fx, 'lifecycle-edit', container);
  });
  it('renders 5 profiles × (12 phases + posture) editable cells with the shipped values', () => {
    const { container } = render(<LifecycleEdit />);
    expect(container.querySelectorAll('tbody input')).toHaveLength(5 * 13);
    expect((screen.getByLabelText('Feature add (active development) · V3 weight') as HTMLInputElement).value).toBe('1.3');
    expect((screen.getByLabelText('Maintenance (stabilised) · automation posture') as HTMLInputElement).value).toBe('1.12');
  });
  it('a weight edit changes the document and the case, is flagged as edited, and undo restores', () => {
    render(<LifecycleEdit />);
    const before = computeCase(doc()).model, input = () => screen.getByLabelText('Feature add (active development) · V3 weight') as HTMLInputElement;
    fireEvent.change(input(), { target: { value: '0.5' } });
    expect(growth().weights?.V3).toBe(0.5);
    expect(input().dataset.edited).toBe('true');
    expect(computeCase(doc()).model.ceiling).toBeLessThan(before.ceiling);   // V3 weighs less, so the effort-weighted ceiling moves
    act(() => { appStore().undo(); });
    expect(growth().weights?.V3).toBe(1.3);
    expect(computeCase(doc()).model.ceiling).toBe(before.ceiling);
  });
  it('the automation posture scales the effective automation and the savings', () => {
    render(<LifecycleEdit />);
    const before = sav();
    fireEvent.change(screen.getByLabelText('Feature add (active development) · automation posture'), { target: { value: '0.8' } });
    expect(growth().autoPosture).toBe(0.8);
    expect((sav()[2] as number)).toBeLessThan(before[2] as number);
    act(() => { appStore().undo(); });
    expect(sav()).toEqual(before);
  });
  it('invalid or negative values are ignored (legacy keeps the previous value)', () => {
    render(<LifecycleEdit />);
    const input = screen.getByLabelText('Feature add (active development) · automation posture') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '-1' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(growth().autoPosture).toBe(1);
  });
  it('posture and weight edits reproduce the legacy tuneB-run fixture (same edits through the UI and the inputs)', () => {
    render(<LifecycleEdit />);
    fireEvent.change(screen.getByLabelText('Feature add (active development) · automation posture'), { target: { value: '1.3' } });
    fireEvent.change(screen.getByLabelText('Feature add (active development) · V3 weight'), { target: { value: '0.5' } });
    const inputs = [['runFloorMin', '2'], ['runFloorPct', '10'], ['runOpsPerAgent', '0.3'], ['khTargetCC', '1'], ['khA3', '4']];
    act(() => { inputs.forEach(([k, v]) => setInput(k as string, v as string)); });
    const exp = JSON.parse(readFileSync('fixtures/expected/tuneB-run.json', 'utf8')).model;
    sav().forEach((v, i) => expect(Math.abs(v - (exp.yearSav[i] as number))).toBeLessThan(1e-6 * Math.max(1, Math.abs(exp.yearSav[i] as number))));
    expect(computeCase(doc()).model.eff).toBeCloseTo(exp.eff, 6);
  });
  it('reset restores the shipped matrix in one undoable step', () => {
    render(<LifecycleEdit />);
    const before = sav();
    fireEvent.change(screen.getByLabelText('Feature add (active development) · L9 weight'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Feature add (active development) · automation posture'), { target: { value: '0.5' } });
    expect(sav()).not.toEqual(before);
    fireEvent.click(screen.getByText('↺ Reset all to defaults'));
    expect(sav()).toEqual(before);
    expect((screen.getByLabelText('Feature add (active development) · L9 weight') as HTMLInputElement).value).toBe('0.7');
    act(() => { appStore().undo(); });
    expect((screen.getByLabelText('Feature add (active development) · automation posture') as HTMLInputElement).value).toBe('0.5');
  });
});
