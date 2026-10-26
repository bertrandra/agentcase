// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { setProductOverride } from '@/controllers/productOverrides';
import { setAllReadiness } from '@/controllers/tuneA';
import { corePortfolio, scheduledProducts } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { freshStore } from '../store/helpers';
import { openPortfolioFixture } from '../helpers/portfolioFixtures';
import { LAZY, mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { CASES } from '../helpers/vueTuneCases';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));
type View = { kind: 'portfolio' } | { kind: 'wave'; i: 0 | 1 };

const idsOf = (v: View): string[] => scheduledProducts(corePortfolio(pf())).filter((s) => v.kind === 'portfolio' || s.wave.id === pf().waves[v.i]!.id)
  .map((s) => s.product.id);
const label = (v: View): string => (v.kind === 'portfolio' ? 'Portfolio' : pf().waves[v.i]!.name);
const show = (v: View) => act(() => { setDisplayScope(v.kind === 'portfolio' ? { kind: 'portfolio' } : { kind: 'wave', id: pf().waves[v.i]!.id }); });
const VIEWS: View[] = [{ kind: 'portfolio' }, { kind: 'wave', i: 0 }, { kind: 'wave', i: 1 }];
const banner = () => document.querySelector('.ac-scope-banner')?.textContent ?? '';

let ids: string[], active: { id: string; name: string };
beforeEach(() => {
  openPortfolioFixture('pf-three-products');
  ids = idsOf({ kind: 'portfolio' });
  active = { id: pf().activeProductId, name: pf().products.find((x) => x.id === pf().activeProductId)!.name };
  const [, b, c] = ids as [string, string, string];
  setProductOverride(b, 'values.setupTooling', '50000'); setProductOverride(c, 'values.setupTooling', '5000'); setProductOverride(b, 'values.runFloorMin', '2');
  setProductOverride(b, 'values.sddMat', '60'); setProductOverride(b, 'values.pilotFte', '5'); setProductOverride(c, 'values.aiActTier', 'high');
  setProductOverride(c, 'values.elPre_plat', 'unmet'); setProductOverride(b, 'lifecyclePos', 80); setProductOverride(c, 'MATURITY_MAP',
    { rampBounds: [0, 30, 60, 85] });
  setAllReadiness(50);
});
afterEach(cleanup);

const table = (caption: string, v: View) => screen.getByRole('table', { name: new RegExp(`${caption} — ${label(v)}`) });

describe.each(CASES)('$id: Portfolio and each Wave show the domain figures', (k) => {
  it.each(VIEWS.map((v) => [v.kind === 'portfolio' ? 'Portfolio' : `Wave ${v.i + 1}`, v] as const))('%s', async (_n, v) => {
    mountApp(k.id); show(v);
    await sectionReady(k.title);
    const p = corePortfolio(pf()), sel = idsOf(v), t = table(k.caption, v);
    expect(banner()).toContain(k.input ? 'Changing: all products (shared values) — aggregate view' : 'Calculated on:');   // "Change: All products" (default)
    expect(t.querySelectorAll('tbody tr')).toHaveLength(sel.length);
    for (const r of k.rows(p, sel)) for (const x of r.texts) expect(t.querySelector(`tbody tr[data-row="${r.id}"]`)!.textContent,
      `${k.id} ${r.id}`).toContain(x);
    for (const x of k.total?.(p, sel) ?? []) expect(t.querySelector('tfoot tr')!.textContent, `${k.id} total`).toContain(x);
    if (k.spread) expect(screen.getByRole('table', { name: new RegExp(`${k.spread} — ${label(v)}`) }).querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    if (v.kind === 'portfolio') expect(screen.getByText(/Excluded from the figures/).textContent).toContain('Archive (no wave)');
    expect(screen.getAllByRole('button', { name: /^Edit this product/ })).toHaveLength(sel.length);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });

  it('Product view: the section as before (no aggregate, no banner of a view)', async () => {
    mountApp(k.id); show({ kind: 'portfolio' }); act(() => { setDisplayScope({ kind: 'product' }); });
    await sectionReady(k.title);
    expect(document.querySelector('.ac-agg-table, .ac-drill, [data-readonly]')).toBeNull();
    expect(banner()).toBe(k.input ? `Changing: product ${active.name}` : `Calculated on: Product: ${active.name}`);
  });

  if (k.input) {
    it('"Edit this product" makes the View that product and the section editable again', async () => {
      mountApp(k.id); show({ kind: 'portfolio' });
      await sectionReady(k.title);
      const undo = appStore().getState().history.undo.length;
      fireEvent.click(screen.getByRole('button', { name: 'Edit this product: Billing' }));
      expect(pf().activeProductId).toBe(ids[2]);
      expect(pf().displayScope).toEqual({ kind: 'product' });
      expect(appStore().getState().history.undo).toHaveLength(undo);
      await waitFor(() => expect(document.querySelector('.ac-agg-table')).toBeNull());
      expect(banner()).toBe('Changing: product Billing');
    });
  } else {
    it.each(VIEWS.slice(0, 2).map((v) => [v.kind === 'portfolio' ? 'Portfolio' : 'Wave 1', v] as const))(
      '%s: the product detail opens read-only and shows that product’s figures', async (_n, v) => {
      mountApp(k.id); show(v);
      await sectionReady(k.title);
      expect(document.querySelectorAll('[data-readonly]')).toHaveLength(0);
      fireEvent.click(screen.getByRole('button', { name: /Product 1$/, expanded: false }));
      const region = await screen.findByRole('region', { name: 'Detail: Product 1' });
      expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
      await waitFor(() => expect(region.textContent).toContain(k.drill!(ids[0]!, corePortfolio(pf()))), LAZY);
      expect(document.querySelectorAll('h1')).toHaveLength(1);
      expect(pf().activeProductId).toBe(active.id);
    });
  }
});

describe('one product: nothing changes', () => {
  it.each(CASES.map((k) => [k.id, k] as const))('%s: no banner, no aggregate', async (_id, k) => {
    freshStore();
    mountApp(k.id);
    await sectionReady(k.title);
    expect(document.querySelector('.ac-scope-banner, .ac-agg-table, .ac-drill')).toBeNull();
    expect(within(document.querySelector('main')!).getAllByRole('article')).toHaveLength(1);
  });
});

describe('smoke: every section of the group renders under the Portfolio and under a Wave', () => {
  it.each(CASES.flatMap((k) => VIEWS.slice(0, 2).map((v) => [k.id, v.kind === 'portfolio' ? 'Portfolio' : 'Wave 1', k, v] as const)))('%s / %s',
    async (_id, _n, k, v) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mountApp(k.id); show(v);
    await sectionReady(k.title);
    expect(banner()).not.toBe('');
    expect(document.body.textContent).not.toMatch(/coming soon|Consolidated view coming|à venir/i);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
