// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import OpModel from '@/ui/sections/tune/opmodel';
import { freshStore } from '../../store/helpers';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { loadFixture } from '../../helpers/tuneA';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const state = () => appStore().getState().doc;
const calc = () => computeCase(state());
const text = (c: HTMLElement) => renderedText(c).replace(/\s+/g, ' ');
/** The Y1 column of the topology table, by row label. */
const y1 = (label: RegExp) => {
  const row = screen.getAllByRole('row').find((r) => label.test(r.textContent ?? ''));
  return parseFloat(row?.querySelectorAll('td')[1]?.textContent ?? 'NaN');
};

describe('opmodel section', () => {
  it.each(['golden', 'ctx-msi', 'curve-logistic', 'industry-med'])('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<OpModel />);
    expect(missingNumbers(legacySectionText(fx, 'opmodel')!, renderedText(container))).toEqual([]);
  });
  it('pod size re-cuts the pods (V7: a re-labelling, the euros do not move) and the lean Y3 residual widens the pods automatically', () => {
    const { container } = render(<OpModel />);
    const sav = calc().model.yearSav;
    expect(text(container)).toMatch(/recomposes into 5 pod\(s\) of ~ 3 at Y1/);
    expect(text(container)).toMatch(/Pod size auto-widened to 4 FTE/);
    fireEvent.change(screen.getByLabelText('Pod size (2–4)'), { target: { value: '4' } });
    expect(state().dom.values.omPodSize).toBe('4');
    expect(text(container)).toMatch(/recomposes into 4 pod\(s\) of ~ 4 at Y1/);
    expect(text(container)).not.toMatch(/auto-widened/);
    expect(calc().model.yearSav).toEqual(sav);
    act(() => { appStore().undo(); });
    expect(text(container)).toMatch(/recomposes into 5 pod\(s\)/);
  });
  it('the roles re-label the residual team: they add up to it (CC-OM-01) and nothing is added', () => {
    render(<OpModel />);
    const roles = [/Pod Orchestrator/, /AI Reviewer/, /Engineers/, /Preceptor/, /Agent Architect/, /Token FinOps/, /Design Authority/, /AI Office — Lead/].map(y1);
    const residual = y1(/Residual project team/);
    expect(roles.reduce((a, b) => a + b, 0)).toBeCloseTo(residual, 1);
    expect(y1(/Total human headcount/)).toBeCloseTo(residual + y1(/Agentic run team/), 1);
    expect(screen.getByRole('status').textContent).toMatch(/✓ CC-OM-01/);
  });
  it('the horizon sets the last column (Y5), the context caps the maturity: reviewers move to 1 per pod at L2 or below', () => {
    const { container } = render(<OpModel />);
    expect(text(container)).toMatch(/AI Reviewer \(0\.5\/pod at L\s*4\)/);
    act(() => { setInput('horizon', '5'); });
    expect(text(container)).toMatch(/Topology — Y1 vs Y5 \(FTE\)/);
    expect(text(container)).toMatch(/By Y5 the residual is/);
    act(() => { setInput('engagementCtx', 'STA'); });
    expect(text(container)).toMatch(/AI Reviewer \(1\/pod at L\s*2\)/);
    expect(text(container)).toMatch(/Under\s+STA\s*, agent authority is capped at A\s*\d/);
    expect(text(container)).toMatch(/L\s*2\s*→\s*L\s*2\s*maturity trajectory/);
  });
});
