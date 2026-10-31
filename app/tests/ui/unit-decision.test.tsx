// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { pfDecision, runStats, selectionStress, UNASSIGNED_UNIT, type GroupScope } from '@/domain/portfolio';
import { VERDICT_META } from '@/domain/verdict';
import { pfSimStore } from '@/store/portfolioSimulation';
import { fmtEurOrNA as fmtEur } from '@/ui/format';
import { LAZY, mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { unitTreeThree } from '../helpers/unitScope';
import { bodyRows, expectShown, table, text } from '../helpers/vueAgg';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));
beforeEach(() => { pfSimStore.setState({ run: null, progress: null, params: null }); });
afterEach(cleanup);

/** F-B83 / D-B40 (phase B10d): Monte Carlo, Decision, Results and the ranking at a Unit scope, read from the one portfolio run. */
const unit = (id: string): GroupScope => ({ kind: 'unit', id });
const show = (s: GroupScope | { kind: 'portfolio' }) => act(() => { setDisplayScope(s); });
const stat = (l: string) => screen.getAllByText(l).find((e) => e.classList.contains('ac-stat-l'))!.parentElement!.querySelector('.ac-stat-v')!.textContent;

describe('Monte Carlo at a unit', () => {
  it('the unit\'s distribution from the run; switching units never runs the simulation again', async () => {
    unitTreeThree();
    await runPortfolioSimulation({ draws: 200, seed: 5 });
    const run = pfSimStore.getState().run!, builds = runStats.builds;
    mountApp('montecarlo'); show(unit('bu'));
    await sectionReady(/Monte Carlo — uncertainty explorer/);
    const sel = selectionStress(run, unit('bu'), pf())!;
    expect(stat('P10 (adverse outcome)')).toBe(fmtEur(sel.stats.p10)); expect(stat('Risk reduction')).toBe(fmtEur(sel.diversification.reduction));
    expect(screen.getByRole('img', { name: 'Distribution of the unit net benefit' })).toBeTruthy();
    expect(bodyRows(/Stress by product — Retail BU/)).toBe(2);
    expect(text(table(/Stress by product — Retail BU/))).toContain('Correlation with the unit');
    for (const id of ['d1', 'd3', UNASSIGNED_UNIT, 'bu']) show(unit(id));
    expect(pfSimStore.getState().run).toBe(run); expect(pfSimStore.getState().progress).toBeNull(); expect(runStats.builds).toBe(builds);
    expect(screen.queryByText(/not available at the unit scope/)).toBeNull();
  });
});

describe('Decision and Results at a unit', () => {
  it('the unit\'s verdict, the ranking of its sub-units, and the ranking of the top units at the Portfolio', async () => {
    unitTreeThree();
    await runPortfolioSimulation({ draws: 200, seed: 5 });
    const run = pfSimStore.getState().run!, d = pfDecision(pf(), run, unit('bu'))!;
    mountApp('decision'); show(unit('bu'));
    await sectionReady(/Decision Intelligence/);
    expect(await screen.findByText('Verdict — Retail BU', undefined, LAZY)).toBeTruthy();
    expect(document.body.textContent).toContain(VERDICT_META[d.verdict].label);
    const ranking = table(/Units ranked by verdict/);
    expect(bodyRows(/Units ranked by verdict/)).toBe(2);
    expectShown(ranking, ['Payments', 'Lending']);
    fireEvent.click(screen.getByRole('button', { name: 'Show unit Payments' }));
    expect(pf().displayScope).toEqual(unit('d1'));
    show({ kind: 'portfolio' });
    expectShown(table(/Units ranked by verdict/), ['Retail BU', 'Unassigned']);
  });

  it('Results leads with the unit\'s probabilistic verdict', async () => {
    unitTreeThree();
    await runPortfolioSimulation({ draws: 200, seed: 5 });
    const d = pfDecision(pf(), pfSimStore.getState().run!, unit('d3'))!;
    mountApp('results'); show(unit('d3'));
    await sectionReady(/Results — consolidated outcome — Lending/);
    expect(document.body.textContent).toContain(VERDICT_META[d.verdict].label);
    expect(screen.queryByText(/Run portfolio simulation/)).toBeNull();
  });
});
