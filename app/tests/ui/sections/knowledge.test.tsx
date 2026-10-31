// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import Knowledge from '@/ui/sections/tune/knowledge';
import { freshStore } from '../../store/helpers';
import { editParam, expectReference } from '../../helpers/programmeParam';
import { expectParity, FIXTURES, loadFixture } from './tuneBHelpers';
import { caseValues } from '@/domain/process';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const sav = () => computeCase(doc()).model.yearSav;
const expectedSav = (id: string) => JSON.parse(readFileSync(`fixtures/expected/${id}.json`, 'utf8')).model.yearSav as number[];
const sameAs = (got: number[], exp: number[]) => got.forEach((v, i) => {
  const e = exp[i] as number;
  expect(Math.abs(v - e)).toBeLessThan(1e-6 * Math.max(1, Math.abs(e)));
});

describe('knowledge section', () => {
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<Knowledge />);
    expectParity(fx, 'knowledge', container);
  });
  it('disabling the hub reproduces the hub-off fixture and neutralises the three channels; undo restores', () => {
    render(<Knowledge />);
    const before = sav();
    fireEvent.click(screen.getByLabelText('Enable the Knowledge hub in the model'));
    expect(doc().dom.checked.khEnabled).toBe(false);
    sameAs(sav(), expectedSav('kh-off'));
    expect(screen.getByText(/Channel 2/).closest('tr')!.textContent).toContain('—');
    act(() => { appStore().undo(); });
    expect(sav()).toEqual(before);
    expect(screen.getByText(/Channel 2/).closest('tr')!.textContent).toContain('σ × 0.76');
  });
  // B9a (DEV-B9A-CONTEXT-SCREENS): the hub's target, setup base, days, curation and infrastructure are parameters of the hub setup and run
  // activities, edited in the Process section; the AS-IS assessment stays here and the read-out follows both
  it('AS-IS answers and the target maturity reproduce the legacy kh-high fixture', () => {
    render(<Knowledge />);
    expectReference('Target CC (Y3)', 'Knowledge Hub setup');
    editParam('khTargetCC', '4');
    ['Key artifacts are captured', 'Domain knowledge is captured', 'Decisions/ADRs are captured']
      .forEach((l) => fireEvent.change(screen.getByLabelText(new RegExp(l)), { target: { value: '4' } }));
    expect(doc().dom.values.khA2).toBe('4');
    sameAs(sav(), expectedSav('kh-high'));
    expect(screen.getByText('× 1.06')).toBeTruthy();
    expect(screen.getByText('−32%')).toBeTruthy();
  });
  it('cost inputs change the hub cost and the net delta', () => {
    render(<Knowledge />);
    expect(screen.getByText('Hub cost — setup + run (3y)').closest('tr')!.textContent).toContain('€318K');
    expectReference('Curation (FTE)', 'Knowledge Hub run');
    editParam('khCurationFTE', '1');
    expect(caseValues(doc()).khCurationFTE).toBe('1');
    expect(screen.getByText('Hub cost — setup + run (3y)').closest('tr')!.textContent).not.toContain('€318K');
    editParam('khSetupBase', '0');
    expect(screen.getByText('Hub-attributable Δ net savings (3y)').closest('tr')!.textContent).toContain('€-');
  });
  it('the engagement context bounds the reachable level (STA locks the hub, MSI clamps the target)', () => {
    render(<Knowledge />);
    act(() => { setInput('engagementCtx', 'MSI'); });
    expect(screen.getByText(/Target clamped to CC2/)).toBeTruthy();
    act(() => { setInput('engagementCtx', 'STA'); });
    expect(screen.getByText(/Locked by the engagement context \(STA\)/)).toBeTruthy();
  });
});
