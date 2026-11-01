// @vitest-environment jsdom
import { caseValues } from '@/domain/process';
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import RunSizing from '@/ui/sections/tune/run-sizing';
import { freshStore } from '../../store/helpers';
import { editParam, expectReference } from '../../helpers/programmeParam';
import { expectParity, FIXTURES, loadFixture } from './tuneBHelpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const runCost = () => computeCase(doc()).model.yearRunAgenticCost;

describe('run-sizing section', () => {
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<RunSizing />);
    // DEV-HORIZON-LABELS (FX-52): the legacy help quoted a fixed ~€244k legacy run team; ours prints this case's, from the engine
    expectParity(fx, 'run-sizing', container, [244000]);
  });
  // B9a (DEV-B9A-CONTEXT-SCREENS): the sizing policy is a parameter of the AgentOps run activity, edited in the Process section; the preview follows it
  it('the sizing policy drives the run-team cost and the preview; undo restores', () => {
    render(<RunSizing />);
    const before = runCost();
    expectReference('Ops load per agent vFTE', 'AgentOps run team');
    editParam('runOpsPerAgent', '0.3');
    expect(caseValues(doc()).runOpsPerAgent).toBe('0.3');
    expect((runCost()[2] as number)).toBeGreaterThan(before[2] as number);
    expect(screen.getByText('Run team (FTE)').closest('tr')!.textContent).not.toContain('2.29');
    act(() => { appStore().undo(); });
    expect(runCost()).toEqual(before);
    expect(screen.getByText('Run team (FTE)').closest('tr')!.textContent).toContain('2.29');
  });
  it('legacy mode reproduces the legacy run-legacy-size fixture', () => {
    render(<RunSizing />);
    editParam('runSizeMode', 'legacy');
    const exp = JSON.parse(readFileSync('fixtures/expected/run-legacy-size.json', 'utf8')).model.yearRunAgenticCost as number[];
    runCost().forEach((v, i) => expect(Math.abs(v - (exp[i] as number))).toBeLessThan(1e-6 * Math.max(1, exp[i] as number)));
  });
  it('the supervision cap and factor are coefficients: they re-split the residual team without moving the savings', () => {
    render(<RunSizing />);
    const sav = computeCase(doc()).model.yearSav;
    expect(screen.getByText(/3\.3 dev \+ 0\.5 supervision FTE/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Supervision share cap'), { target: { value: '0.1' } });
    expect(doc().COEF.supShareCap).toBe(0.1);
    expect(doc().dom.values.runSupShareCap).toBe('0.1');
    expect(screen.getByText(/3\.4 dev \+ 0\.4 supervision FTE/)).toBeTruthy();
    expect(computeCase(doc()).model.yearSav).toEqual(sav);
    act(() => { appStore().undo(); });
    expect(doc().COEF.supShareCap).toBe(0.5);
  });
  it('display-only coefficients are edited without touching the euro result', () => {
    render(<RunSizing />);
    const npv = computeCase(doc()).npv;
    fireEvent.change(screen.getByLabelText('Agent capacity factor ×'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('AI-FinOps (flat FTE)'), { target: { value: '0.9' } });
    expect(doc().COEF.prodFactor).toBe(2);
    expect(doc().COEF.aiFinOpsFte).toBe(0.9);
    expect(computeCase(doc()).npv).toBe(npv);
  });
});
