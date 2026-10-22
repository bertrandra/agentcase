// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assignWave } from '@/controllers/wave';
import { fmtRoiPct } from '@/domain/economics/roi';
import { aggregateResults, aggregateStrategies, consolidate, pfDecision, portfolioMonteCarlo, type DisplayScope } from '@/domain/portfolio';
import { VERDICT_META } from '@/domain/verdict';
import { pfSimStore } from '@/store/portfolioSimulation';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { bodyRows, totalRow, view } from '../helpers/vueEPV';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); pfSimStore.setState({ run: null, progress: null, params: null }); });
afterEach(cleanup);
const scopes = () => [{ name: 'Portfolio', scope: { kind: 'portfolio' } as DisplayScope, n: 3 }, { name: 'Wave 1', scope: { kind: 'wave', id: waves[0] } as DisplayScope, n: 2 }, { name: 'Wave 2', scope: { kind: 'wave', id: waves[1] } as DisplayScope, n: 1 }];
const banner = () => document.querySelector('.ac-scope-banner')!.textContent;
const kpi = (label: RegExp): string => screen.getAllByText(label).find((e) => e.classList.contains('ac-stat-l'))!.parentElement!.querySelector('.ac-stat-v')!.textContent ?? '';

describe('Verdict > Results: aggregate view', () => {
  it.each([0, 1, 2])('scope %i: key figures, decomposition, team shift and product lines are the domain figures; no run yet = invitation', async (i) => {
    const { name, scope, n } = scopes()[i]!;
    mountApp('results'); view(scope);
    await sectionReady(new RegExp(`Results — consolidated outcome — ${name}`));
    const a = aggregateResults(pf(), consolidate(pf()), scope)!;
    expect(kpi(/^Net benefit/)).toBe(fmtEurK(a.totals.net));
    expect(kpi(/^ROI/)).toBe(fmtRoiPct(a.totals.roi));
    expect(kpi(/^Payback/)).toBe(fmtMonths(a.totals.paybackMonth));
    expect(kpi(/^Automation depth/)).toBe(`${a.totals.eff.toFixed(1)}%`);
    expect(screen.getByText(/Team shift/).closest('section')!.textContent).toContain(a.team.human.toFixed(1));
    expect(bodyRows(/Results by product/)).toHaveLength(n);
    expect(totalRow(/Results by product/).textContent).toContain(fmtEurK(a.totals.net));
    expect(screen.getByRole('button', { name: /Run portfolio simulation/ })).toBeTruthy();
    expect(banner()).toContain('Calculated on');
  });
  it('with a portfolio simulation: the verdict and the uncertainty band are those of the scope\'s distribution', async () => {
    const run = portfolioMonteCarlo(pf(), { draws: 200, seed: 7, rho: 0 });
    act(() => { pfSimStore.setState({ run }); });
    mountApp('results'); view({ kind: 'wave', id: waves[0] });
    await sectionReady(/Results — consolidated outcome — Wave 1/);
    const d = pfDecision(pf(), run, { kind: 'wave', id: waves[0] })!;
    expect(screen.getAllByText(new RegExp(VERDICT_META[d.verdict].label)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(`${d.confidence}%`).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Run portfolio simulation/ })).toBeNull();
  });
  it('an unscheduled product is excluded with the note; Product view is today\'s section', async () => {
    mountApp('results'); view({ kind: 'portfolio' }); act(() => { assignWave(ids[2], null); });
    await sectionReady(/Results — consolidated outcome — Portfolio/);
    expect(bodyRows(/Results by product/)).toHaveLength(2);
    expect(screen.getByText(/Excluded from the figures/).textContent).toContain('C');
    view({ kind: 'product' });
    await sectionReady(/^📋 Results — consolidated outcome$/);
    expect(document.querySelector('.ac-agg-table')).toBeNull();
  });
});

describe('Verdict > Strategy comparison: roll-up view', () => {
  it.each([0, 1, 2])('scope %i: recommended strategy, ROI and TCO per product and the roll-up line are the domain figures', async (i) => {
    const { name, scope, n } = scopes()[i]!;
    mountApp('strategies'); view(scope);
    await sectionReady(new RegExp(`Strategy comparison — ${name}`));
    const a = aggregateStrategies(pf(), consolidate(pf()), scope)!;
    expect(bodyRows(/Recommended strategy by product/)).toHaveLength(n);
    expect(bodyRows(/Recommended strategy by product/)[0]!.textContent).toContain(a.rows[0]!.label);
    expect(bodyRows(/Recommended strategy by product/)[0]!.textContent).toContain(fmtEurK(a.rows[0]!.tco));
    expect(totalRow(/Recommended strategy by product/).textContent).toContain(fmtEurK(a.totals.tco));
    expect(totalRow(/Recommended strategy by product/).textContent).toContain(fmtRoiPct(a.totals.roi));
    expect(banner()).toContain('Calculated on');
  });
  it('ProductDrill opens one product read-only; "Edit this product" makes it the View; unscheduled product excluded', async () => {
    mountApp('strategies'); view({ kind: 'portfolio' }); act(() => { assignWave(ids[2], null); });
    await sectionReady(/Strategy comparison — Portfolio/);
    expect(screen.getByText(/Excluded from the figures/).textContent).toContain('C');
    fireEvent.click(screen.getByRole('button', { name: /B$/, expanded: false }));
    const region = await screen.findByRole('region', { name: 'Detail: B' });
    expect((await within(region).findAllByRole('table')).length).toBeGreaterThan(0);
    expect(within(region).queryByText('Strategy configuration')).toBeNull();
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
    fireEvent.click(within(region.closest('li')!).getByRole('button', { name: 'Edit this product: B' }));
    expect(pf().activeProductId).toBe(ids[1]);
    await sectionReady(/Strategy comparison — 7 delivery strategies/);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
  });
});

describe('Verdict > Decision Intelligence: native, under all three views', () => {
  it.each([0, 1, 2])('scope %i: the portfolio / wave verdict, no generic fallback', async (i) => {
    const { scope } = scopes()[i]!;
    const run = portfolioMonteCarlo(pf(), { draws: 200, seed: 3, rho: 0 });
    act(() => { pfSimStore.setState({ run }); });
    mountApp('decision'); view(scope);
    await sectionReady(/Decision Intelligence/);
    const d = pfDecision(pf(), run, scope as { kind: 'portfolio' } | { kind: 'wave'; id: string })!;
    expect(screen.getAllByText(new RegExp(VERDICT_META[d.verdict].label)).length).toBeGreaterThan(0);
    expect(document.querySelector('.ac-drill, .ac-agg-table:not(table)')).toBeNull();
    expect(banner()).toContain('Calculated on');
  });
  it('Product view: the product\'s own Decision Intelligence', async () => {
    mountApp('decision'); view({ kind: 'portfolio' }); view({ kind: 'product' });
    await sectionReady(/Decision Intelligence/);
    expect(screen.getByText(/Run the Monte Carlo simulation first/)).toBeTruthy();
  });
});
