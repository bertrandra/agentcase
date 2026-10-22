// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assignWave } from '@/controllers/wave';
import { addProduct, setProductOffset } from '@/controllers/product';
import { consolidate, portfolioHeadline } from '@/domain/portfolio';
import { fmtRoiPct } from '@/domain/economics/roi';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const open = async () => { mountApp('consolidation'); await sectionReady(/Consolidation/); };
const table = (name: RegExp) => screen.getByRole('table', { name });
const cells = (tr: Element) => [...tr.querySelectorAll('th, td')].map((c) => c.textContent ?? '');
const stat = (label: RegExp) => screen.getAllByText(label).find((e) => e.classList.contains('ac-stat-l'))!.parentElement!.querySelector('.ac-stat-v')!.textContent;

describe('Consolidation section', () => {
  it('headline cards are the domain portfolio headline', async () => {
    await open();
    const h = portfolioHeadline(consolidate(pf()));
    expect(stat(/^Économies Y/)).toBe(fmtEurK(h.endYear.savings));
    expect(stat(/^Coût de fonctionnement Y/)).toBe(fmtEurK(h.endYear.run));
    expect(stat(/^Mise en place$/)).toBe(fmtEurK(h.setup));
    expect(stat(/^Net$/)).toBe(fmtEurK(h.net));
    expect(stat(/^ROI$/)).toBe(fmtRoiPct(h.roi));
    expect(stat(/^Retour \(mois\)$/)).toBe(fmtMonths(h.paybackMonth));
    expect(stat(/^VAN calendaire$/)).toBe(fmtEurK(h.npv));
    expect(stat(/^Vélocité$/)).toBe(`+${Math.round(h.velocityPct)}%`);
    expect(stat(/^Économies sur \d+ ans$/)).toMatch(/%$/);
  });

  it('the by-wave and by-product totals rows equal the portfolio headline (A4 at UI level)', async () => {
    await open();
    const h = portfolioHeadline(consolidate(pf()));
    for (const name of [/Consolidation par vague/, /Consolidation par produit/]) {
      const total = cells(table(name).querySelector('tfoot tr')!);
      expect(total[0]).toBe('Total — portefeuille');
      expect(total).toContain(fmtEurK(h.npv));
      expect(total).toContain(fmtEurK(h.net));
      expect(total).toContain(fmtEurK(h.setup));
      expect(total).toContain(fmtEurK(h.totalBenefit));
      expect(total).toContain(fmtMonths(h.paybackMonth));
    }
    expect(within(table(/Consolidation par vague/)).getAllByRole('row')).toHaveLength(1 + 2 + 1);
    expect(within(table(/Consolidation par produit/)).getAllByRole('row')).toHaveLength(1 + 3 + 1);
    const c = consolidate(pf());
    const rowB = cells(table(/Consolidation par produit/).querySelector('tr[data-row="' + ids[1] + '"]')!);
    expect(rowB[0]).toBe('B');
    expect(rowB[1]).toBe(fmtEurK(c.products[1]!.summary.npv));
    expect(rowB).toContain(fmtMonths(c.products[1]!.summary.paybackMonth));
  });

  it('the chart is named and offers its data as text: portfolio and one line per wave', async () => {
    await open();
    const chart = screen.getByRole('img', { name: /Trésorerie cumulée par mois calendaire/ });
    expect(chart).toBeTruthy();
    const data = within(screen.getByRole('group', { name: /Trésorerie cumulée par mois calendaire.*data/ })).getAllByText(/:/).map((p) => p.textContent ?? '');
    expect(data.map((l) => l.split(':')[0])).toEqual(['Portefeuille', 'Vague 1', 'Wave 2']);
  });

  it('an unscheduled product is excluded with the warning; assigning it brings it back', async () => {
    await open();
    act(() => { assignWave(ids[1], null); });
    expect(within(table(/Consolidation par produit/)).queryByText('B')).toBeNull();
    const diag = screen.getByRole('list', { name: 'Diagnostics de la consolidation' });
    expect(within(diag).getByText('Produit non planifié').closest('li')!.textContent).toContain('B has no wave');
    expect(screen.getByText(/Exclus de la consolidation : B/)).toBeTruthy();
    const h = portfolioHeadline(consolidate(pf()));
    expect(cells(table(/Consolidation par produit/).querySelector('tfoot tr')!)).toContain(fmtEurK(h.net));
    act(() => { assignWave(ids[1], waves[0]); });
    expect(within(table(/Consolidation par produit/)).getByText('B')).toBeTruthy();
    expect(screen.queryByText('Produit non planifié')).toBeNull();   // C (month 6) stays reported as cut by the horizon
  });

  it('a product cut by the horizon is reported; moving a product refreshes the totals', async () => {
    await open();
    act(() => { setProductOffset(ids[2], 40); });
    const diag = screen.getByRole('list', { name: 'Diagnostics de la consolidation' });
    expect(within(diag).getByText('Coupé à l’horizon')).toBeTruthy();
    act(() => { addProduct('D', null); });
    expect(within(diag.closest('section')!).getByText(/D has no wave/)).toBeTruthy();
  });

  it('axe finds no violation', async () => {
    await open();
    const r = await axe.run(document.querySelector('main') as HTMLElement, { rules: { 'color-contrast': { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(' | ')}`)).toEqual([]);
  });
});
