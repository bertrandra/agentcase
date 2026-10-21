// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import TokenEcon from '@/ui/sections/tune/token-econ';
import { freshStore } from '../../store/helpers';
import { expectParity, FIXTURES, loadFixture } from './tuneBHelpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const tokenCost = () => computeCase(doc()).model.yearToken;

describe('token-econ section', () => {
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<TokenEcon />);
    expectParity(fx, 'token-econ', container);
  });
  it('shows the headline figures of the default case', () => {
    render(<TokenEcon />);
    expect(screen.getAllByText('€44,550').length).toBeGreaterThan(0);
    expect(screen.getAllByText('61,875').length).toBeGreaterThan(0);
    expect(screen.getByText(/Mix total/).textContent).toContain('100%');
  });
  it('model mix and prices edit the document, the blended price and the token cost; undo restores', () => {
    render(<TokenEcon />);
    const before = tokenCost();
    fireEvent.change(screen.getByLabelText('Claude Opus 4.8 Mix %'), { target: { value: '60' } });
    expect(doc().TOKEN_MODELS[3]?.mix).toBe(60);
    expect(screen.getByText(/Mix total/).textContent).toContain('130%');
    expect((tokenCost()[2] as number)).toBeGreaterThan(before[2] as number);
    fireEvent.change(screen.getByLabelText('Claude Haiku 4.5 Price out (€/1M)'), { target: { value: '9' } });
    expect(doc().TOKEN_MODELS[1]?.priceOut).toBe(9);
    act(() => { appStore().undo(); appStore().undo(); });
    expect(tokenCost()).toEqual(before);
  });
  it('mix is clamped to 100 and prices to 0; add, rename, remove and reset rows', () => {
    render(<TokenEcon />);
    fireEvent.change(screen.getByLabelText('Mistral Large Mix %'), { target: { value: '250' } });
    expect(doc().TOKEN_MODELS[0]?.mix).toBe(100);
    fireEvent.change(screen.getByLabelText('Mistral Large Price in (€/1M)'), { target: { value: '-4' } });
    expect(doc().TOKEN_MODELS[0]?.priceIn).toBe(0);
    fireEvent.click(screen.getByText('＋ Add model'));
    expect(doc().TOKEN_MODELS).toHaveLength(8);
    fireEvent.blur(screen.getByLabelText('Model 8 name'), { target: { value: 'Local 70B' } });
    expect(doc().TOKEN_MODELS[7]?.name).toBe('Local 70B');
    fireEvent.click(screen.getByLabelText('Remove Local 70B'));
    expect(doc().TOKEN_MODELS).toHaveLength(7);
    fireEvent.click(screen.getByText('↺ Reset'));
    expect(doc().TOKEN_MODELS[0]).toEqual({ name: 'Mistral Large', mix: 0, priceIn: 2, priceOut: 6 });
    expect(doc().TOK_OUT_SHARE).toBe(35);
  });
  it('volume drivers and output share move the token cost; the by-artefact table reconciles with the by-model table', () => {
    const { container } = render(<TokenEcon />);
    const before = tokenCost();
    fireEvent.change(screen.getByLabelText('Agent runs / day (per agent-FTE)'), { target: { value: '50' } });
    expect((tokenCost()[2] as number)).toBeCloseTo((before[2] as number) * 2, 4);
    fireEvent.change(screen.getByLabelText('Output token share'), { target: { value: '60' } });
    expect(doc().TOK_OUT_SHARE).toBe(60);
    expect(doc().dom.values.tokOutShare).toBe('60');
    const totals = [...container.querySelectorAll('tbody tr:last-child')].map((tr) => within(tr as HTMLElement).getAllByRole('cell').slice(-1)[0]!.textContent);
    expect(totals[1]).toBe(totals[2]);   // run cost 3y by model == cost 3y by artefact
    act(() => { appStore().undo(); appStore().undo(); });
    expect(tokenCost()).toEqual(before);
  });
});
