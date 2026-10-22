// @vitest-environment jsdom
import { act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { archiveProduct } from '@/controllers/product';
import { assignWave } from '@/controllers/wave';
import { goSection } from '@/ui/uiState';
import { freshStore } from '../store/helpers';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, sectionReady } from '../helpers/portfolioUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

afterEach(cleanup);
const banner = () => document.querySelector('.ac-scope-banner');
const text = () => banner()?.textContent ?? '';
const open = async (id: string, title: RegExp) => { act(() => goSection(id)); await sectionReady(title); };

describe('one product: the aggregate view adds nothing', () => {
  beforeEach(() => { freshStore(); });
  it('no banner, no replacement of the section, whatever its kind', async () => {
    mountApp('team-in');
    await sectionReady(/Input team/);
    expect(banner()).toBeNull();
    const main = document.querySelector('main')!;
    expect(main.children).toHaveLength(1);
    expect(main.firstElementChild!.tagName).toBe('ARTICLE');
    for (const [id, t] of [['financial', /Financial Summary/], ['glossary', /glossary/i], ['scope-sel', /Scope/]] as const) {
      await open(id, t);
      expect(banner(), id).toBeNull();
      expect(document.querySelector('.ac-agg-table, .ac-drill, .ac-readonly'), id).toBeNull();
    }
  });
});

describe('two or more products: the banner states the View for this section by kind', () => {
  let ids: [string, string, string], waves: [string, string];
  beforeEach(() => { ({ ids, waves } = threeProducts()); });

  it('Product view: results say which product, inputs say which product is edited; sections render as today', async () => {
    mountApp('financial');
    await sectionReady(/Financial Summary — \d+-year case/);
    expect(text()).toBe('Calculated on: Product: Product 1');
    await open('team-in', /Input team/);
    expect(text()).toBe('Editing: product Product 1');
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
  });

  it('Portfolio: counts planned products; reference and portfolio sections say so', async () => {
    mountApp('financial');
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await sectionReady(/Financial Summary — Portfolio/);
    expect(text()).toBe('Calculated on: Portfolio (3 planned products)');
    await open('team-in', /Input team/);
    expect(text()).toBe('Editing: product Product 1 — aggregate view of the selection below: Portfolio (3 planned products)');
    await open('glossary', /glossary/i);
    expect(text()).toBe('Independent of the view');
    await open('consolidation', /Consolidation/);
    expect(text()).toBe('Portfolio level');
  });

  it('Wave: names the wave; a product left without a wave is announced as excluded', async () => {
    mountApp('financial');
    act(() => { setDisplayScope({ kind: 'wave', id: waves[0] }); });
    await sectionReady(/Financial Summary — Wave 1/);
    expect(text()).toBe('Calculated on: Wave: Wave 1 (2 planned products)');
    act(() => { archiveProduct(ids[1]); });
    expect(text()).toBe('Calculated on: Wave: Wave 1 (1 planned product) — 1 unscheduled or archived product excluded from the figures');
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await sectionReady(/Financial Summary — Portfolio/);
    expect(text()).toBe('Calculated on: Portfolio (2 planned products) — 1 unscheduled or archived product excluded from the figures');
    act(() => { assignWave(ids[2], null); });
    expect(text()).toContain('Portfolio (1 planned product) — 2 unscheduled or archived products excluded from the figures');
  });

  it('is a polite live region and is present once', async () => {
    mountApp('financial');
    await sectionReady(/Financial Summary/);
    expect(document.querySelectorAll('.ac-scope-banner')).toHaveLength(1);
    expect(banner()!.getAttribute('aria-live')).toBe('polite');
    expect(banner()!.hasAttribute('role')).toBe(false);   // not a second status / alert next to the toast region
  });
});
