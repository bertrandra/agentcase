// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { makeCtx } from '@/domain';
import { mcSeedOf, runMonteCarlo } from '@/domain/stress';
import { resultsCore } from '@/domain/verdict';
import { appStore } from '@/store/instance';
import { fmtEur } from '@/ui/sections/stress/fmt';
import Results from '@/ui/sections/verdict/results';
import { missingFor, openFixture, PARITY_FIXTURES } from '../../helpers/stressParity';

afterEach(cleanup);
const core = () => resultsCore(makeCtx(appStore().getState().doc));
const kpi = (label: string) => screen.getByText(label).closest('.ac-stat')!.querySelector('.ac-stat-v')!.textContent;

describe('results section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    expect(missingFor(Results, 'results', fx)).toEqual([]);
  });
  it('before a run: the deterministic view and the invitation to run the Monte Carlo', () => {
    openFixture('golden');
    render(<Results />);
    expect(screen.getByText(/Probabilistic verdict not yet computed/)).toBeTruthy();
    expect(kpi('ROI — on setup investment')).toBe('713%');
    expect(screen.queryByText(/Uncertainty \(Monte Carlo/)).toBeNull();
  });
  it('the figures follow an edit and undo restores them', () => {
    openFixture('golden');
    render(<Results />);
    const net = kpi('Net benefit (3-yr) — after €225,000 setup');
    act(() => { setInput('y3Ramp', 80); });
    expect(kpi('Net benefit (3-yr) — after €225,000 setup')).toBe(fmtEur(core().net));
    expect(kpi('Net benefit (3-yr) — after €225,000 setup')).not.toBe(net);
    act(() => { appStore().undo(); });
    expect(kpi('Net benefit (3-yr) — after €225,000 setup')).toBe(net);
  });
  it('running the Monte Carlo adds the verdict and the uncertainty band (stored seed), a later edit flags it stale', () => {
    openFixture('mc-seed-7');
    render(<Results />);
    fireEvent.click(screen.getByText('▶ Run Monte Carlo'));
    const c = makeCtx(appStore().getState().doc), r = runMonteCarlo(c, 1000, mcSeedOf(c));
    expect(screen.getByText('Uncertainty (Monte Carlo, 1000 draws)')).toBeTruthy();
    expect(screen.getByText('P50 median').closest('.ac-stat')!.textContent).toContain(fmtEur(r.stats.p50));
    expect(screen.getByText(/RECOMMENDED|CONDITIONALLY VIABLE|DEFER/)).toBeTruthy();
    expect(screen.queryByText(/Probabilistic verdict not yet computed/)).toBeNull();
    act(() => { setInput('y1Ramp', 40); });
    expect(screen.getByText(/Scenario changed since the last run/)).toBeTruthy();
  });
  it('shows the savings decomposition and the team shift of the engine', () => {
    openFixture('golden');
    render(<Results />);
    const t = core();
    expect(screen.getByText(`= ${fmtEur(t.last.total)} total savings / yr`)).toBeTruthy();
    expect(screen.getByText(t.team.agent.toFixed(1))).toBeTruthy();
    expect(t.last.grossAuto - t.last.agentCost + t.last.relocation).toBeCloseTo(t.last.total, 6);
  });
});
