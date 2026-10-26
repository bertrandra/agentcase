// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableSup } from '@/controllers/modelSupervision';
import { assignWave } from '@/controllers/wave';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { supervisionByProduct } from '@/domain/portfolio';
import { fmtEurOrNA as fmtEur } from '@/ui/format';
import { pfSimStore } from '@/store/portfolioSimulation';
import { freshStore } from '../store/helpers';
import { threeProducts } from '../helpers/portfolioStore';
import { LAZY, mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { run, SPECS } from '../helpers/modelEngineSpecs';
import { banner, bodyRows, expectShown, openDrill, planned, rowOf, text, totalOf, view } from '../helpers/vueAgg';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { pfSimStore.setState({ run: null, progress: null, params: null }); ({ ids, waves } = threeProducts()); });
afterEach(cleanup);


describe.each(SPECS)('model-engine aggregate: $id', (s) => {
  const name = (id: string) => pf().products.find((p) => p.id === id)!.name;

  it('Portfolio: a line per planned product with the phase figures, the roll-up from the domain', async () => {
    mountApp(s.id); view('portfolio');
    await sectionReady(s.title);
    expect(banner()).toBe('Calculated on: Portfolio (3 planned products)');
    expect(bodyRows(s.caption)).toBe(3);
    for (const id of ids) expectShown(rowOf(s.caption, id), s.shown(id));
    expectShown(totalOf(s.caption), ['Total — Portfolio', ...s.total(planned())]);
    expect(document.body.textContent).not.toMatch(/coming/i);
  });

  it('Wave: only its products, and the roll-up of those', async () => {
    mountApp(s.id); view('wave', waves[0]);
    await sectionReady(s.title);
    expect(banner()).toContain('Wave: Wave 1 (2 planned products)');
    expect(bodyRows(s.caption)).toBe(2); expect(rowOf(s.caption, ids[2])).toBeNull();
    expectShown(rowOf(s.caption, ids[1]), s.shown(ids[1]));
    expectShown(totalOf(s.caption), ['Total — Wave 1', ...s.total([ids[0], ids[1]])]);
    view('wave', waves[1]);
    await screen.findByText(/Wave: Wave 2 \(1 planned product\)/);
    expect(bodyRows(s.caption)).toBe(1); expectShown(rowOf(s.caption, ids[2]), s.shown(ids[2]));
  });

  it('an unscheduled product is excluded, with the note', async () => {
    mountApp(s.id); view('portfolio'); act(() => { assignWave(ids[2], null); });
    await sectionReady(s.title);
    expect(bodyRows(s.caption)).toBe(2);
    expect(banner()).toContain('1 unscheduled or archived product excluded from the figures');
    expect(screen.getByText(/Excluded from the figures:/).textContent).toContain(name(ids[2]));
    expectShown(totalOf(s.caption), s.total(planned()));
  });

  it('Product: today’s section, no aggregate', async () => {
    mountApp(s.id); view('portfolio'); view('product');
    await sectionReady(s.title);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
    expect(banner()).toBe('Calculated on: Product: Product 1');
  });

  it('the drill-down opens one product, read-only, with that product’s own figures', async () => {
    mountApp(s.id); view('portfolio');
    await sectionReady(s.title);
    const region = await openDrill(name(ids[1]));
    expect((await within(region).findAllByText(s.drill.caption, undefined, LAZY)).length).toBeGreaterThan(0);
    expectShown(region, s.drill.shown(ids[1]));
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
    expect(pf().activeProductId).toBe(ids[0]);
    expect(region.querySelectorAll('fieldset[disabled]').length).toBeGreaterThan(0);
  });

  it('one product: the section as it is', async () => {
    freshStore(); mountApp(s.id);
    await sectionReady(s.title);
    expect(document.querySelector('.ac-scope-banner, .ac-agg-table, .ac-drill')).toBeNull();
  });
});

describe('model-engine aggregate: what the phases show', () => {
  it('Supervision: a phase switched on is counted ON in every product', async () => {
    mountApp('model-supervision'); view('portfolio'); act(() => { enableSup(true); });
    await sectionReady(/Supervision — provisioned or constrained/);
    expect(supervisionByProduct(pf(), planned()).totals.on).toBe(3);
    expectShown(totalOf(/Supervision by product/), ['3 of 3 on']);
    for (const id of ids) expectShown(rowOf(/Supervision by product/, id), ['ON']);
  });

  it('Stochastic: after the portfolio run each product shows its P50 and the roll-up is the selection’s P50', async () => {
    await runPortfolioSimulation({ draws: 200, seed: 4 });
    mountApp('model-stochastic'); view('portfolio');
    await sectionReady(/Stochastic layer & baseline drift/);
    const r = run()!;
    for (const p of r.products) expectShown(rowOf(/Stochastic layer by product/, p.id), [fmtEur(p.stats.p50)]);
    expectShown(totalOf(/Stochastic layer by product/), [fmtEur(r.stats.p50)]);
    view('wave', waves[1]);
    await screen.findByText(/Calculated on: Wave: Wave 2/);
    expectShown(totalOf(/Stochastic layer by product/), [fmtEur(r.waves.find((w) => w.id === waves[1])!.stats.p50)]);
    expect(text(screen.getByRole('button', { name: /Portfolio stress/ }))).toContain('Portfolio stress');
  });
});
