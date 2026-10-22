// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { assignWave } from '@/controllers/wave';
import { aggregateTeams, consolidate, portfolioHeadline, scheduledProducts, waveHeadline } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { fmtEurK } from '@/ui/format';
import { SECTION_AGGREGATES } from '@/ui/sections/aggregates';
import { SECTION_KIND_IDS, sectionKind } from '@/ui/zones/sectionScope';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const stat = (label: string): string => screen.getAllByText(label).find((e) => e.classList.contains('ac-stat-l'))!.parentElement!.querySelector('.ac-stat-v')!.textContent ?? '';
const table = (name: RegExp) => screen.getByRole('table', { name });
const totalRow = (name: RegExp) => table(name).querySelector('tfoot tr')!;
const view = (kind: 'portfolio' | 'wave' | 'product', id = '') => act(() => { setDisplayScope(kind === 'wave' ? { kind, id } : { kind }); });

describe('exemplar R-conso: Economics > Financial', () => {
  it('Portfolio: the cards, the product lines and the total line are the domain figures', async () => {
    mountApp('financial'); view('portfolio');
    await sectionReady(/Financial Summary — Portfolio/);
    const h = portfolioHeadline(consolidate(pf()));
    expect(stat('Net')).toBe(fmtEurK(h.net));
    expect(stat('Setup')).toBe(fmtEurK(h.setup));
    const t = table(/Figures by product — Portfolio/);
    expect(t.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(totalRow(/Figures by product/).textContent).toContain(fmtEurK(h.net));
    expect(within(table(/Flows of the selection/)).getAllByRole('row').length).toBeGreaterThan(2);
  });

  it('Wave: only its products, and the wave headline', async () => {
    mountApp('financial'); view('wave', waves[1]);
    await sectionReady(/Financial Summary — Wave 2/);
    const h = waveHeadline(consolidate(pf()), waves[1])!;
    expect(stat('Net')).toBe(fmtEurK(h.net));
    expect(table(/Figures by product — Wave 2/).querySelectorAll('tbody tr')).toHaveLength(1);
    expect(totalRow(/Figures by product/).textContent).toContain('Total — Wave 2');
  });

  it('an unplanned product is excluded from the figures, with the warning', async () => {
    mountApp('financial'); view('portfolio'); act(() => { assignWave(ids[2], null); });
    await sectionReady(/Financial Summary — Portfolio/);
    expect(stat('Net')).toBe(fmtEurK(portfolioHeadline(consolidate(pf())).net));
    expect(table(/Figures by product/).querySelectorAll('tbody tr')).toHaveLength(2);
    expect(screen.getByText(/Excluded from the figures/).textContent).toContain('C');
    expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('1 unscheduled or archived product excluded from the figures');
  });

  it('Product: today\'s Financial Summary, no aggregate', async () => {
    mountApp('financial'); view('portfolio'); view('product');
    await sectionReady(/Financial Summary — \d+-year case/);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
  });
});

describe('exemplar I-input: Input team', () => {
  it('Portfolio: one row per product, totals from aggregateTeams, nothing editable', async () => {
    mountApp('team-in'); view('portfolio');
    await sectionReady(/Input team/);
    const t = aggregateTeams(pf(), scheduledProducts(pf()).map((s) => s.product.id));
    expect(table(/Entry teams by product/).querySelectorAll('tbody tr')).toHaveLength(3);
    expect(totalRow(/Entry teams by product/).textContent).toContain(t.total.toFixed(2));
    for (const n of [/by skill$/, /by grade$/, /by location$/]) expect(totalRow(n).textContent).toContain(t.total.toFixed(2));
    expect(screen.queryByRole('button', { name: /Add a resource/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Edit this product/ })).toHaveLength(3);
  });

  it('Wave: only its products', async () => {
    mountApp('team-in'); view('wave', waves[0]);
    await sectionReady(/Input team/);
    expect(table(/Entry teams by product/).querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('"Edit this product" makes the View that product and activates it: the section is editable again, history untouched', async () => {
    mountApp('team-in'); view('portfolio');
    await sectionReady(/Input team/);
    const undo = appStore().getState().history.undo.length;
    fireEvent.click(screen.getByRole('button', { name: 'Edit this product: B' }));
    expect(pf().activeProductId).toBe(ids[1]);
    expect(pf().displayScope).toEqual({ kind: 'product' });
    expect(appStore().getState().history.undo).toHaveLength(undo);
    expect(await screen.findByRole('button', { name: /Add a resource/ })).toBeTruthy();
    expect(document.querySelector('.ac-agg-table')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('View: product B (edited)');
  });
});

describe('generic fallbacks of the kinds that follow the View', () => {
  // a R-rollup section that has no aggregate registered yet (the groups fill them in one by one; the test skips once all have one)
  const ROLLUP = SECTION_KIND_IDS.find((id) => sectionKind(id) === 'R-rollup' && !SECTION_AGGREGATES[id]);
  it.skipIf(!ROLLUP)('R-rollup: key figures per product with the domain total, and a lazy read-only drill-down', async () => {
    mountApp(ROLLUP as string); view('portfolio');
    await sectionReady(/./);
    const h = portfolioHeadline(consolidate(pf()));
    expect(totalRow(/Key figures by product — Portfolio/).textContent).toContain(fmtEurK(h.net));
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /B$/, expanded: false }));
    const region = await screen.findByRole('region', { name: 'Detail: B' });
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
    expect(await within(region).findByRole('heading', { level: 4 })).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(pf().activeProductId).toBe(ids[0]);
  });

  it('I-input: the per-product synthesis with the ETP total', async () => {
    mountApp('scope-sel'); view('portfolio');
    await sectionReady(/Scope/);
    const total = aggregateTeams(pf(), scheduledProducts(pf()).map((s) => s.product.id)).total.toFixed(1);
    expect(totalRow(/Inputs by product — Portfolio/).textContent).toContain(total);
    expect(screen.getAllByRole('button', { name: /^Edit this product/ })).toHaveLength(3);
  });

  it('R-conso without an aggregate yet: says so and offers the per-product detail', async () => {
    mountApp('run'); view('portfolio');
    await sectionReady(/Agentic Run/);
    expect(screen.getByText(/Consolidated view coming/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Detail by product' })).toBeTruthy();
  });

  it('sections that already follow the View are rendered as they are', async () => {
    mountApp('decision'); view('portfolio');
    await sectionReady(/Decision Intelligence/);
    expect(document.querySelector('.ac-drill, .ac-agg-table')).toBeNull();
  });
});
