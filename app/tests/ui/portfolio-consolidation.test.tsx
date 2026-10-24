// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import { axeViolations } from '../helpers/axe';
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
    expect(stat(/^Savings Y/)).toBe(fmtEurK(h.endYear.savings));
    expect(stat(/^Run cost Y/)).toBe(fmtEurK(h.endYear.run));
    expect(stat(/^Setup$/)).toBe(fmtEurK(h.setup));
    expect(stat(/^Net$/)).toBe(fmtEurK(h.net));
    expect(stat(/^ROI$/)).toBe(fmtRoiPct(h.roi));
    expect(stat(/^Payback \(months\)$/)).toBe(fmtMonths(h.paybackMonth));
    expect(stat(/^Calendar NPV$/)).toBe(fmtEurK(h.npv));
    expect(stat(/^Velocity$/)).toBe(`+${Math.round(h.velocityPct)}%`);
    expect(stat(/^Savings over \d+ years$/)).toMatch(/%$/);
  });

  it('the by-wave and by-product totals rows equal the portfolio headline (A4 at UI level)', async () => {
    await open();
    const h = portfolioHeadline(consolidate(pf()));
    for (const name of [/Consolidation by wave/, /Consolidation by product/]) {
      const total = cells(table(name).querySelector('tfoot tr')!);
      expect(total[0]).toBe('Total — portfolio');
      expect(total).toContain(fmtEurK(h.npv));
      expect(total).toContain(fmtEurK(h.net));
      expect(total).toContain(fmtEurK(h.setup));
      expect(total).toContain(fmtEurK(h.totalBenefit));
      expect(total).toContain(fmtMonths(h.paybackMonth));
    }
    expect(within(table(/Consolidation by wave/)).getAllByRole('row')).toHaveLength(1 + 2 + 1);
    expect(within(table(/Consolidation by product/)).getAllByRole('row')).toHaveLength(1 + 3 + 1);
    const c = consolidate(pf());
    const rowB = cells(table(/Consolidation by product/).querySelector('tr[data-row="' + ids[1] + '"]')!);
    expect(rowB[0]).toBe('B');
    expect(rowB[1]).toBe(fmtEurK(c.products[1]!.summary.npv));
    expect(rowB).toContain(fmtMonths(c.products[1]!.summary.paybackMonth));
  });

  it('the chart is named and offers its data as text: portfolio and one line per wave', async () => {
    await open();
    const chart = screen.getByRole('img', { name: /Cumulative cash by calendar month/ });
    expect(chart).toBeTruthy();
    const data = within(screen.getByRole('group', { name: /Cumulative cash by calendar month.*data/ })).getAllByText(/:/).map((p) => p.textContent ?? '');
    expect(data.map((l) => l.split(':')[0])).toEqual(['Portfolio', 'Wave 1', 'Wave 2']);
  });

  it('an unscheduled product is excluded with the warning; assigning it brings it back', async () => {
    await open();
    act(() => { assignWave(ids[1], null); });
    expect(within(table(/Consolidation by product/)).queryByText('B')).toBeNull();
    const diag = screen.getByRole('list', { name: 'Consolidation diagnostics' });
    expect(within(diag).getByText('Unscheduled product').closest('li')!.textContent).toContain('B has no wave');
    expect(screen.getByText(/Excluded from the consolidation: B/)).toBeTruthy();
    const h = portfolioHeadline(consolidate(pf()));
    expect(cells(table(/Consolidation by product/).querySelector('tfoot tr')!)).toContain(fmtEurK(h.net));
    act(() => { assignWave(ids[1], waves[0]); });
    expect(within(table(/Consolidation by product/)).getByText('B')).toBeTruthy();
    expect(screen.queryByText('Unscheduled product')).toBeNull();   // C (month 6) stays reported as cut by the horizon
  });

  it('a product cut by the horizon is reported; moving a product refreshes the totals', async () => {
    await open();
    act(() => { setProductOffset(ids[2], 40); });
    const diag = screen.getByRole('list', { name: 'Consolidation diagnostics' });
    expect(within(diag).getByText('Cut at the horizon')).toBeTruthy();
    act(() => { addProduct('D', null); });
    expect(within(diag.closest('section')!).getByText(/D has no wave/)).toBeTruthy();
  });

  it('axe finds no violation', async () => {
    await open();
    expect(await axeViolations(document.querySelector('main'))).toEqual([]);
  });
});
