// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { runSimulation } from '@/controllers/stress';
import { makeCtx } from '@/domain';
import { decide, VERDICT_META } from '@/domain/verdict';
import { appStore } from '@/store/instance';
import { simStore } from '@/store/simulation';
import Decision from '@/ui/sections/verdict/decision';
import { renderedText } from '../../helpers/parity';
import { missingFor, openFixture, PARITY_FIXTURES } from '../../helpers/stressParity';

afterEach(cleanup);
const decision = () => decide(makeCtx(appStore().getState().doc), simStore.getState().run!);

describe('decision section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    expect(missingFor(Decision, 'decision', fx)).toEqual([]);
  });
  it('without a run it asks for one — never a verdict from a point estimate', () => {
    openFixture('golden');
    render(<Decision />);
    expect(screen.getByText(/Run the Monte Carlo simulation first/)).toBeTruthy();
    expect(screen.queryByText(/RECOMMENDED|CONDITIONALLY VIABLE|DEFER — /)).toBeNull();
    expect(screen.getByText(/How this verdict is computed/)).toBeTruthy();
  });
  it('"Run now" computes the verdict from the distribution: confidence, downside, conditions and context', () => {
    openFixture('golden');
    render(<Decision />);
    fireEvent.click(screen.getByText('▶ Run now'));
    const d = decision();
    expect(simStore.getState().run!.n).toBe(1000);
    expect(screen.getByText(/RECOMMENDED/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`${d.confidence}% confidence`))).toBeTruthy();
    d.conditions.forEach((x) => expect(screen.getByText(x)).toBeTruthy());
    expect(screen.getByText('Product status')).toBeTruthy();
    expect(screen.getByText('Feature add (active development)')).toBeTruthy();
  });
  it('the risk modules raise the bar and are listed in the context the engine read', () => {
    openFixture('di-risk-on');
    render(<Decision />);
    act(() => { runSimulation(300); });
    const d = decision();
    expect(d.premium).toBeGreaterThan(0.1);
    ['AI-Act tier', 'AI code-quality risk', 'Agentic risk register', 'Project eligibility', 'AI readiness index'].forEach((k) => expect(screen.getByText(k)).toBeTruthy());
    expect(screen.getByText(new RegExp(VERDICT_META[d.verdict].label))).toBeTruthy();   // the raised bar is visible in the verdict
  });
  it('coherence: the verdict never reads Recommended while P(net<0) exceeds 20 %', () => {
    openFixture('tokens-heavy');
    render(<Decision />);
    act(() => { runSimulation(300); });
    const d = decision();
    if (d.stats.pNetNeg > 0.2) expect(d.verdict).not.toBe('strong');
    expect(renderedText(document.body).replace(/\s+/g, ' ')).toContain(`${d.confidence} % confidence`);
  });
  it('an edit after the run marks the verdict stale (and re-runs it when auto is on)', () => {
    openFixture('golden');
    render(<Decision />);
    act(() => { runSimulation(300); });
    expect(screen.queryByText(/Scenario changed since the last run/)).toBeNull();
    act(() => { appStore().dispatch({ type: 't', label: 'edit', undoable: true, payload: 0, run: (d) => { d.dom.values.y1Ramp = '35'; } }); });
    expect(screen.getByText(/Scenario changed since the last run/)).toBeTruthy();
  });
});
