// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setPortfolioRho } from '@/controllers/portfolio';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { selectionStress } from '@/domain/portfolio';
import { pfSimStore } from '@/store/portfolioSimulation';
import { fmtEurOrNA as fmtEur } from '@/ui/format';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, sectionReady } from '../helpers/portfolioUi';
import { bodyRows, expectShown, openDrill, rowOf, text, totalOf, view } from '../helpers/vueAgg';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { pfSimStore.setState({ run: null, progress: null, params: null }); ({ ids, waves } = threeProducts()); });
afterEach(cleanup);

describe('stress aggregate: Monte Carlo = the portfolio Monte Carlo of the selection', () => {
  const title = /Monte Carlo — uncertainty explorer/;

  it('without a run: invitation to run, the controls, the per-product drill-down', async () => {
    mountApp('montecarlo'); view('portfolio');
    await sectionReady(title);
    expect(screen.getByText(/No simulation yet/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Run the simulation/ })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Detail by product' })).toBeTruthy();
  });

  it('Portfolio: distribution, P10/P50/P90, P(net<0), diversification and the product lines are the run’s', async () => {
    await runPortfolioSimulation({ draws: 200, seed: 3 });
    mountApp('montecarlo'); view('portfolio');
    await sectionReady(title);
    const run = pfSimStore.getState().run!, sel = selectionStress(run, { kind: 'portfolio' })!;
    const stat = (l: string) => screen.getAllByText(l).find((e) => e.classList.contains('ac-stat-l'))!.parentElement!.querySelector('.ac-stat-v')!.textContent;
    expect(stat('P10 (adverse outcome)'))
      .toBe(fmtEur(sel.stats.p10)); expect(stat('P50 (median)')).toBe(fmtEur(sel.stats.p50)); expect(stat('P90 (favourable outcome)'))
      .toBe(fmtEur(sel.stats.p90));
    expect(stat('P(net < 0)')).toBe(`${Math.round(sel.stats.pNetNeg * 100)} %`); expect(stat('Risk reduction')).toBe(fmtEur(sel.diversification.reduction));
    expect(screen.getByRole('img', { name: 'Distribution of the portfolio net benefit' })).toBeTruthy();
    expect(bodyRows(/Stress by product — Portfolio/)).toBe(3);
    expectShown(totalOf(/Stress by product/), [fmtEur(sel.stats.p50), `${Math.round(sel.stats.pNetNeg * 100)} %`]);
    for (const p of sel.products) expectShown(rowOf(/Stress by product/, p.id), [fmtEur(p.stats.p10), fmtEur(p.stats.p90)]);
    expect(screen.getByRole('button', { name: /Portfolio stress/ })).toBeTruthy();
    expect(screen.queryByText(/changed since the last simulation/)).toBeNull();
  });

  it('Wave: the wave’s statistics, its products only, and the histogram of the wave’s draws', async () => {
    await runPortfolioSimulation({ draws: 200, seed: 3 });
    mountApp('montecarlo'); view('wave', waves[0]);
    await sectionReady(title);
    const sel = selectionStress(pfSimStore.getState().run!, { kind: 'wave', id: waves[0] })!;
    expect(bodyRows(/Stress by product — Wave 1/)).toBe(2);
    expectShown(totalOf(/Stress by product/), [fmtEur(sel.stats.p50), 'Total — Wave 1']);
    expectShown(document.querySelector('.ac-zone-result'), [fmtEur(sel.diversification.sumP10), fmtEur(sel.diversification.p10)]);
    expect(screen.queryByRole('img', { name: 'Distribution of the portfolio net benefit' })).toBeNull();
    const chart = screen.getByRole('img', { name: 'Distribution of the wave net benefit' });
    expect(chart.closest('section, .ac-panel')?.textContent).toContain('Wave distribution');
    expect(chart.getAttribute('data-points')).toBe('20');
    expect(chart.getAttribute('data-series')).toBe('Frequency:20');
    expect(sel.outcomes).toBe(pfSimStore.getState().run!.waves.find((w) => w.id === waves[0])!.outcomes);
    expect(sel.outcomes).toHaveLength(200);
    view('wave', waves[1]);
    expect(await screen.findByRole('img', { name: 'Distribution of the wave net benefit' })).toBeTruthy();
    expect(bodyRows(/Stress by product — Wave 2/)).toBe(1);
  });

  it('a change of the portfolio marks the run stale, with the way to run again', async () => {
    await runPortfolioSimulation({ draws: 200, seed: 3 });
    mountApp('montecarlo'); view('portfolio');
    await sectionReady(title);
    act(() => { setPortfolioRho(0.5); });
    expect(await screen.findByText(/changed since the last simulation/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Run again/ })).toBeTruthy();
  });

  it('drill-down: the product’s own distribution of the run, read-only', async () => {
    await runPortfolioSimulation({ draws: 200, seed: 3 });
    mountApp('montecarlo'); view('portfolio');
    await sectionReady(title);
    const region = await openDrill('B'), p = pfSimStore.getState().run!.products.find((x) => x.id === ids[1])!;
    expectShown(region, [fmtEur(p.stats.p50), fmtEur(p.stats.p10)]);
  });

  it('Product: today’s Monte Carlo section', async () => {
    mountApp('montecarlo'); view('portfolio'); view('product');
    await sectionReady(title);
    expect(document.querySelector('.ac-drill')).toBeNull();
    expect(text(document.querySelector('.ac-scope-banner'))).toBe('Calculated on: Product: Product 1');
  });
});
