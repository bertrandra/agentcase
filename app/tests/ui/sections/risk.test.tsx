// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setChecked } from '@/controllers/inputs';
import { computeCase, makeCtx } from '@/domain';
import { riskScore, wave2RiskPremium } from '@/domain/tuneB/risk';
import { appStore } from '@/store/instance';
import Risk from '@/ui/sections/tune/risk';
import { freshStore } from '../../store/helpers';
import { expectParity, FIXTURES, loadFixture } from './tuneBHelpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const sav = () => computeCase(doc()).model.yearSav;

describe('risk section', () => {
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<Risk />);
    expectParity(fx, 'risk', container);
  });
  it('the AI-Act tier and its apply toggle raise the DI bar contribution; undo restores', () => {
    render(<Risk />);
    expect(screen.getByText('Not classified')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('AI-Act risk tier (per mission)'), { target: { value: 'high' } });
    fireEvent.click(screen.getByLabelText('Raise the Decision Intelligence bar for this tier'));
    expect(screen.getByText(/High risk \(Annex III\) · \+10 pts on the DI bar/)).toBeTruthy();
    expect(wave2RiskPremium(makeCtx(doc()))).toBeCloseTo(0.1, 9);
    act(() => { appStore().undo(); appStore().undo(); });
    expect(wave2RiskPremium(makeCtx(doc()))).toBe(0);
  });
  it('the quality premium feeds the verification tax: same savings as the legacy qual-security fixture', () => {
    render(<Risk />);
    expect(screen.getByText('informative only')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Apply the premium (raises verification tax + DI bar)'));
    fireEvent.change(screen.getByLabelText('Severity anchor'), { target: { value: 'security' } });
    expect(screen.getByText('APPLIED')).toBeTruthy();
    expect(screen.getByText('×1.57 (Security)')).toBeTruthy();
    setChecked('vtaxApply', true);   // the legacy fixture also ticks "verification tax applied" (set in another section)
    const exp = JSON.parse(readFileSync('fixtures/expected/qual-security.json', 'utf8')).model.yearSav as number[];
    sav().forEach((v, i) => expect(Math.abs(v - (exp[i] as number))).toBeLessThan(1e-6 * Math.max(1, Math.abs(exp[i] as number))));
    fireEvent.click(screen.getByLabelText('Apply the premium (raises verification tax + DI bar)'));   // off again: tax without premium
    expect((sav()[2] as number)).toBeGreaterThan(exp[2] as number);
  });
  it('quality cap and decision-bar weight are coefficients (shared with the register) and move the premium', () => {
    render(<Risk />);
    fireEvent.click(screen.getByLabelText('Apply the premium (raises verification tax + DI bar)'));
    fireEvent.change(screen.getByLabelText('Quality premium cap ×'), { target: { value: '0.5' } });
    expect(doc().COEF.qualPremiumCap).toBe(0.5);
    expect(doc().dom.values.riskQualCap).toBe('0.5');
    expect(screen.getByText('×1.50')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Decision-bar quality weight'), { target: { value: '0.1' } });
    expect(doc().COEF.qualBarFactor).toBe(0.1);
    expect(screen.getByText('+8 pts')).toBeTruthy();
  });
  it('register cells edit probability and impact; the consolidated score and the apply toggle follow', () => {
    render(<Risk />);
    expect(screen.getByText(/Consolidated risk: High \(65\/100\)/)).toBeTruthy();
    expect(screen.getByText(/informative only — tick the box above/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Probability of Prompt / indirect injection'), { target: { value: '1' } });
    expect(doc().dom.values.risk_p_inject).toBe('1');
    expect(screen.getByText(/Consolidated risk: High \(57\/100\)/)).toBeTruthy();
    expect(riskScore(makeCtx(doc()))).toBeCloseTo(0.5694, 3);
    fireEvent.click(screen.getByLabelText('Feed the consolidated risk score into the Decision Intelligence bar'));
    expect(screen.getByText(/· \+9 pts on the DI bar/)).toBeTruthy();
    act(() => { appStore().undo(); appStore().undo(); });
    expect(screen.getByText(/Consolidated risk: High \(65\/100\)/)).toBeTruthy();
  });
});
