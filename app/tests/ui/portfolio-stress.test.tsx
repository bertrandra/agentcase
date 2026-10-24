// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { axeViolations } from '../helpers/axe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { setPortfolioRho } from '@/controllers/portfolio';
import { setProductOffset } from '@/controllers/product';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { portfolioMonteCarlo, pfDecision } from '@/domain/portfolio';
import { pfSimStore } from '@/store/portfolioSimulation';
import { fmtEur } from '@/domain/format';
import { VERDICT_META } from '@/domain/verdict';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

beforeEach(() => { threeProducts(); pfSimStore.setState({ run: null, progress: null, params: null }); });
afterEach(cleanup);
const open = async () => { mountApp('portfolio-stress'); await sectionReady(/Portfolio stress/); };
const stat = (label: RegExp) => screen.getAllByText(label).find((e) => e.classList.contains('ac-stat-l'))!.parentElement!.querySelector('.ac-stat-v')!.textContent;
const run = async () => { fireEvent.click(screen.getByRole('button', { name: /Run the simulation/ })); await screen.findByRole('table', { name: /Stress by wave/ }, { timeout: 30000 }); };

describe('Portfolio stress section', () => {
  it('is in the Portfolio group and invites to run before any result', async () => {
    await open();
    expect(screen.getByText(/No simulation/)).toBeTruthy();
    expect(screen.getByRole('slider', { name: /Correlation between products/ })).toBeTruthy();
  });

  it('runs the real engine: cards, tables and chart data are the domain run; deterministic with the same seed', async () => {
    await open();
    await run();
    const r = pfSimStore.getState().run!, again = portfolioMonteCarlo(pf(), { draws: r.draws, seed: r.seed, rho: 0 });
    expect(r.outcomes).toEqual(again.outcomes);
    expect(stat(/^P10 \(adverse/)).toBe(fmtEur(r.stats.p10));
    expect(stat(/^P\(net < 0\)$/)).toBe(`${Math.round(r.stats.pNetNeg * 100)} %`);
    expect(stat(/^Risk reduction$/)).toBe(fmtEur(r.diversification.reduction));
    const byProduct = screen.getByRole('table', { name: /Stress by product/ });
    expect(within(byProduct).getAllByRole('row')).toHaveLength(1 + 3);
    expect(screen.getByRole('table', { name: /Stress by wave/ }).querySelectorAll('tbody tr')).toHaveLength(2 + 1);
    expect(document.querySelector('[data-chart-data]')).toBeTruthy();
    expect(screen.getByRole('img', { name: /Distribution of the portfolio net benefit/ })).toBeTruthy();
    expect(screen.queryByText(/changed since the last simulation/)).toBeNull();
  });

  it('rho is a portfolio field set by the slider (undoable); the run uses it', async () => {
    await open();
    fireEvent.change(screen.getByRole('slider', { name: /Correlation between products/ }), { target: { value: '0.5' } });
    expect(pf().rho).toBe(0.5);
    await run();
    expect(pfSimStore.getState().run!.rho).toBe(0.5);
    act(() => { setPortfolioRho(1); });
    expect(await screen.findByText(/changed since the last simulation/)).toBeTruthy();   // the stale marker
  });

  it('a change of the portfolio marks the run stale; re-running clears the marker', async () => {
    await open();
    await run();
    act(() => { setProductOffset(pf().products[1]!.id, 2); });
    expect(await screen.findByText(/changed since the last simulation/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Run again/ }));
    await waitFor(() => expect(screen.queryByText(/changed since the last simulation/)).toBeNull(), { timeout: 30000 });
  });

  it('has no axe violation with a result on screen', async () => {
    await open();
    await run();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe('Decision section at portfolio scope', () => {
  const openDecision = async () => { mountApp('decision'); await sectionReady(/Decision Intelligence/); };
  it('shows the portfolio verdict from the portfolio run, and the per-wave table', async () => {
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await act(async () => { await runPortfolioSimulation({ draws: 200, seed: 42 }); });
    await openDecision();
    const d = pfDecision(pf(), pfSimStore.getState().run!, { kind: 'portfolio' })!;
    expect(document.body.textContent).toContain(VERDICT_META[d.verdict].label);
    expect(document.body.textContent).toContain(`${d.confidence}% confidence`);
    expect(screen.getByRole('table', { name: /Verdict of each wave/ }).querySelectorAll('tbody tr')).toHaveLength(2);
  });
  it('without a portfolio run it offers to run, then shows the verdict', async () => {
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await openDecision();
    fireEvent.click(screen.getByRole('button', { name: /Run now/ }));
    expect((await screen.findAllByText(/confidence/, undefined, { timeout: 30000 })).length).toBeGreaterThan(0);
    expect(pfSimStore.getState().run).not.toBeNull();
  });
  it('a wave scope speaks for that wave; the product scope keeps today\'s decision screen', async () => {
    act(() => { setDisplayScope({ kind: 'wave', id: pf().waves[1]!.id }); });
    await act(async () => { await runPortfolioSimulation({ draws: 200, seed: 42 }); });
    await openDecision();
    expect(document.body.textContent).toContain('Wave 2 · 1 product');
    cleanup();
    act(() => { setDisplayScope({ kind: 'product' }); });
    await openDecision();
    expect(screen.getByText(/Run the Monte Carlo simulation first/)).toBeTruthy();
  });
});
