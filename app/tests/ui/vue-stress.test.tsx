// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { setPortfolioRho } from '@/controllers/portfolio';
import { assignWave } from '@/controllers/wave';
import { compareByProduct, productCtx, scenarioByProduct, selectionStress, sensitivityByProduct } from '@/domain/portfolio';
import { compareData, fmtK, fmtPayback, fmtSigned, roiText, scenarioSet } from '@/domain/stress';
import { freshStore } from '../store/helpers';
import { fmtEurOrNA as fmtEur } from '@/ui/format';
import { pfSimStore } from '@/store/portfolioSimulation';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { banner, bodyRows, expectShown, openDrill, planned, rowOf, table, text, totalOf, view } from '../helpers/vueAgg';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { pfSimStore.setState({ run: null, progress: null, params: null }); ({ ids, waves } = threeProducts()); });
afterEach(cleanup);

const KEYS = ['ai', 'loc', 'ramp', 'ailoc', 'aidst'] as const;
const scen = (id: string) => scenarioSet(productCtx(pf(), id));
const cell = (id: string, k: (typeof KEYS)[number]) => scen(id).find((s) => s.key === k)!.m;

interface Spec { id: string; title: RegExp; product: RegExp; tables: { name: RegExp; shown: (id: string) => string[] }[]; total?: () => string[]; drill: (id: string) => { caption: RegExp; shown: string[] } }
const SPECS: Spec[] = [
  { id: 'scenarios', title: /Scenario comparison — 6 transformation strategies/, product: /Scenario comparison — 6 transformation strategies/,
    tables: [
      { name: /Net by scenario/, shown: (id) => KEYS.map((k) => fmtSigned(cell(id, k).totBen - cell(id, k).setup)) },
      { name: /ROI by scenario/, shown: (id) => KEYS.map((k) => roiText(cell(id, k))) },
      { name: /Payback by scenario/, shown: (id) => KEYS.map((k) => fmtPayback(scenarioByProduct(pf(), [id])[0]!.cells.find((c) => c.key === k)!.payback, cell(id, k).horizon * 12)) },
    ],
    drill: (id) => ({ caption: /ROI trajectory by scenario/, shown: [roiText(cell(id, 'aidst')), roiText(cell(id, 'ai'))] }) },
  { id: 'compare', title: /3-way Comparison/, product: /3-way Comparison — AS-IS \/ AS-IS \+ saving \/ Agentic/,
    tables: [{ name: /Final-year key figures by product/, shown: (id) => { const r = compareByProduct(pf(), [id]).rows[0]!; return [fmtK(r.agenticSave), fmtK(r.classicSave), fmtK(r.asisCost), r.agenticFte.toFixed(1), r.vfte.toFixed(1)]; } }],
    total: () => { const t = compareByProduct(pf(), planned()).totals; return [fmtK(t.agenticSave), fmtK(t.classicSave), t.agenticFte.toFixed(1), t.vfte.toFixed(1)]; },
    drill: (id) => ({ caption: /Key figures — comparison/, shown: [compareData(productCtx(pf(), id)).rows[0]![3]!] }) },
  { id: 'sensitivity', title: /^Sensitivity$/, product: /^Sensitivity$/,
    tables: [
      { name: /Key parameters by product/, shown: (id) => sensitivityByProduct(pf(), [id])[0]!.params.map((p) => p.value) },
      { name: /Most sensitive parameter/, shown: (id) => { const r = sensitivityByProduct(pf(), [id])[0]!; return [r.most.parameter, r.most.level, `${r.negative} of ${r.cells}`, `${Math.round((r.roiLow as number) * 100)}%`]; } },
    ],
    drill: (id) => ({ caption: /Automation × Glass ceiling matrix/, shown: [sensitivityByProduct(pf(), [id])[0]!.params[0]!.value] }) },
];

describe.each(SPECS)('stress aggregate: $id', (s) => {
  const name = (id: string) => pf().products.find((p) => p.id === id)!.name;

  it('Portfolio: one line per planned product with the domain figures, no portfolio total unless the domain supplies one', async () => {
    mountApp(s.id); view('portfolio');
    await sectionReady(s.title);
    expect(banner()).toBe('Calculated on: Portfolio (3 planned products)');
    for (const t of s.tables) {
      expect(bodyRows(t.name)).toBe(3);
      for (const id of ids) expectShown(rowOf(t.name, id), t.shown(id));
    }
    if (s.total) expectShown(totalOf(s.tables[0]!.name), s.total());
    else expect(document.querySelector('tfoot')).toBeNull();
    expect(document.body.textContent).not.toMatch(/coming/i);
  });

  it('Wave: only the products of the wave, and the roll-up of those', async () => {
    mountApp(s.id); view('wave', waves[0]);
    await sectionReady(s.title);
    expect(banner()).toContain('Wave: Wave 1 (2 planned products)');
    for (const t of s.tables) { expect(bodyRows(t.name)).toBe(2); expect(rowOf(t.name, ids[2])).toBeNull(); expectShown(rowOf(t.name, ids[1]), t.shown(ids[1])); }
    if (s.id === 'compare') expectShown(totalOf(s.tables[0]!.name), (() => { const t = compareByProduct(pf(), [ids[0], ids[1]]).totals; return [fmtK(t.agenticSave), t.agenticFte.toFixed(1)]; })());
    view('wave', waves[1]);
    await screen.findByText(/Wave: Wave 2 \(1 planned product\)/);
    expect(bodyRows(s.tables[0]!.name)).toBe(1);
  });

  it('an unscheduled product is excluded, with the note', async () => {
    mountApp(s.id); view('portfolio'); act(() => { assignWave(ids[2], null); });
    await sectionReady(s.title);
    expect(bodyRows(s.tables[0]!.name)).toBe(2);
    expect(banner()).toContain('1 unscheduled or archived product excluded from the figures');
    expect(screen.getByText(/Excluded from the figures:/).textContent).toContain(name(ids[2]));
    if (s.total) expectShown(totalOf(s.tables[0]!.name), (() => { const t = compareByProduct(pf(), planned()).totals; return [fmtK(t.agenticSave)]; })());
  });

  it('Product: today’s section, no aggregate', async () => {
    mountApp(s.id); view('portfolio'); view('product');
    await sectionReady(s.product);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
    expect(banner()).toBe('Calculated on: Product: Product 1');
  });

  it('the drill-down opens one product, read-only, with that product’s own figures', async () => {
    mountApp(s.id); view('portfolio');
    await sectionReady(s.title);
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(0);
    const region = await openDrill(name(ids[1])), d = s.drill(ids[1]);
    expect((await within(region).findAllByText(d.caption)).length).toBeGreaterThan(0);
    expectShown(region, d.shown);
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
    expect(pf().activeProductId).toBe(ids[0]);
  });
});

describe('stress aggregate: single product', () => {
  it('no banner, no aggregate: the section as it is', async () => {
    freshStore(); mountApp('scenarios');
    await sectionReady(/Scenario comparison/);
    expect(document.querySelector('.ac-scope-banner, .ac-agg-table, .ac-drill')).toBeNull();
  });
});

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
    expect(stat('P10 (adverse outcome)')).toBe(fmtEur(sel.stats.p10)); expect(stat('P50 (median)')).toBe(fmtEur(sel.stats.p50)); expect(stat('P90 (favourable outcome)')).toBe(fmtEur(sel.stats.p90));
    expect(stat('P(net < 0)')).toBe(`${Math.round(sel.stats.pNetNeg * 100)} %`); expect(stat('Risk reduction')).toBe(fmtEur(sel.diversification.reduction));
    expect(screen.getByRole('img', { name: 'Distribution of the portfolio net benefit' })).toBeTruthy();
    expect(bodyRows(/Stress by product — Portfolio/)).toBe(3);
    expectShown(totalOf(/Stress by product/), [fmtEur(sel.stats.p50), `${Math.round(sel.stats.pNetNeg * 100)} %`]);
    for (const p of sel.products) expectShown(rowOf(/Stress by product/, p.id), [fmtEur(p.stats.p10), fmtEur(p.stats.p90)]);
    expect(screen.getByRole('button', { name: /Portfolio stress/ })).toBeTruthy();
    expect(screen.queryByText(/changed since the last simulation/)).toBeNull();
  });

  it('Wave: the wave’s statistics, its products only, no histogram', async () => {
    await runPortfolioSimulation({ draws: 200, seed: 3 });
    mountApp('montecarlo'); view('wave', waves[0]);
    await sectionReady(title);
    const sel = selectionStress(pfSimStore.getState().run!, { kind: 'wave', id: waves[0] })!;
    expect(bodyRows(/Stress by product — Wave 1/)).toBe(2);
    expectShown(totalOf(/Stress by product/), [fmtEur(sel.stats.p50), 'Total — Wave 1']);
    expectShown(document.querySelector('.ac-zone-result'), [fmtEur(sel.diversification.sumP10), fmtEur(sel.diversification.p10)]);
    expect(screen.queryByRole('img', { name: 'Distribution of the portfolio net benefit' })).toBeNull();
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
