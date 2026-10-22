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

describe('one product: the Vue agrégée adds nothing', () => {
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

describe('two or more products: the banner states the Vue for this section by kind', () => {
  let ids: [string, string, string], waves: [string, string];
  beforeEach(() => { ({ ids, waves } = threeProducts()); });

  it('Produit view: results say which product, inputs say which product is edited; sections render as today', async () => {
    mountApp('financial');
    await sectionReady(/Financial Summary — \d+-year case/);
    expect(text()).toBe('Calculé sur : Produit Produit 1');
    await open('team-in', /Input team/);
    expect(text()).toBe('Édition : produit Produit 1');
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
  });

  it('Portefeuille: counts planned products; reference and portfolio sections say so', async () => {
    mountApp('financial');
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await sectionReady(/Financial Summary — Portefeuille/);
    expect(text()).toBe('Calculé sur : Portefeuille (3 produits planifiés)');
    await open('team-in', /Input team/);
    expect(text()).toBe('Édition : produit Produit 1 — vue agrégée de la sélection ci-dessous : Portefeuille (3 produits planifiés)');
    await open('glossary', /glossary/i);
    expect(text()).toBe('Independent of the view');
    await open('consolidation', /Consolidation/);
    expect(text()).toBe('Portfolio level');
  });

  it('Vague: names the wave; a product left without a wave is announced as excluded', async () => {
    mountApp('financial');
    act(() => { setDisplayScope({ kind: 'wave', id: waves[0] }); });
    await sectionReady(/Financial Summary — Vague 1/);
    expect(text()).toBe('Calculé sur : Vague Vague 1 (2 produits planifiés)');
    act(() => { archiveProduct(ids[1]); });
    expect(text()).toBe('Calculé sur : Vague Vague 1 (1 produit planifié) — 1 produit non planifié ou archivé, exclu des chiffres');
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await sectionReady(/Financial Summary — Portefeuille/);
    expect(text()).toBe('Calculé sur : Portefeuille (2 produits planifiés) — 1 produit non planifié ou archivé, exclu des chiffres');
    act(() => { assignWave(ids[2], null); });
    expect(text()).toContain('Portefeuille (1 produit planifié) — 2 produits non planifiés ou archivés, exclus des chiffres');
  });

  it('is a polite live region and is present once', async () => {
    mountApp('financial');
    await sectionReady(/Financial Summary/);
    expect(document.querySelectorAll('.ac-scope-banner')).toHaveLength(1);
    expect(banner()!.getAttribute('aria-live')).toBe('polite');
    expect(banner()!.hasAttribute('role')).toBe(false);   // not a second status / alert next to the toast region
  });
});
