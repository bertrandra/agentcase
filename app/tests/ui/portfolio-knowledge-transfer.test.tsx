// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeProduct } from '@/controllers/product';
import { setPortfolioHub } from '@/controllers/portfolio';
import { setProductKnowledge } from '@/controllers/productOverrides';
import { assignWave } from '@/controllers/wave';
import { knowledgeTable } from '@/domain/portfolio';
import { fmtEurK } from '@/ui/format';
import { openGroup } from '@/ui/uiState';
import { mountApp, pf, sectionReady, sidebar } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const table = () => screen.getByRole('table', { name: /^Knowledge transfer by product/ });
const row = (name: string) => within(table()).getByRole('button', { name: new RegExp(name) }).closest('tr')!;
const cells = (tr: HTMLElement) => [...tr.querySelectorAll('th, td')].map((c) => c.textContent ?? '');
async function open() { mountApp('knowledge-transfer'); await sectionReady(/Knowledge transfer/); }

describe('Knowledge transfer section', () => {
  it('has one row per product with the figures of knowledgeTable, and a total row that is their sum', async () => {
    setProductKnowledge(ids[1], { targetCC: 1, curationFTE: 1, domains: [{ label: 'Docs', weightPct: 40 }, { label: 'Code', weightPct: 60 }] });
    await open();
    const t = knowledgeTable(pf());
    expect(within(table()).getAllByRole('row')).toHaveLength(1 + 3 + 1);
    t.rows.forEach((r) => {
      const c = cells(row(r.name));
      expect(c[1]).toBe(pf().waves.find((w) => w.id === r.waveId)!.name);
      expect(c[2]).toBe('on');
      expect(c[3]).toContain(`CC${r.asisCC} → CC${r.targetCC}`);
      expect(c[5]).toBe(fmtEurK(r.setup));
      expect(c[6]).toBe(fmtEurK(r.annual));
      expect(c[7]).toBe(String(Math.round(r.ktDays)));
      expect(c[9]).toBe(fmtEurK(r.hubDeltaSav));
    });
    expect(cells(row('B'))[4]).toBe('Docs 40 %, Code 60 %');
    expect(cells(row('B'))[3]).toContain('CC1');
    const total = cells(table().querySelector('tfoot tr') as HTMLElement);
    expect(total[5]).toBe(fmtEurK(t.rows.reduce((a, r) => a + r.setup, 0)));
    expect(total[6]).toBe(fmtEurK(t.totals.annual));
    expect(total[7]).toBe(String(Math.round(t.totals.ktDays)));
    expect(total[9]).toBe(fmtEurK(t.totals.hubDeltaSav));
  });

  it('shows the preparation (lead and calendar month) and flags a capped target', async () => {
    setProductKnowledge(ids[2], { ktLeadMonths: 2 });
    await open();
    expect(cells(row('C'))[8]).toBe('2 months (from month 5)');
    expect(cells(row('B'))[8]).toBe('0 months (from month 1)');
    act(() => { setProductKnowledge(ids[1], { targetCC: 4 }); });
    expect(within(row('B')).queryByText(/plafonnée/)).toBeNull();
  });

  it('filters by wave: the rows and the total follow', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Filter by wave'), { target: { value: pf().waves[1]!.id } });
    expect(within(table()).getAllByRole('row')).toHaveLength(3);
    const t = knowledgeTable(pf()), c = t.rows.find((r) => r.productId === ids[2])!;
    expect(cells(table().querySelector('tfoot tr') as HTMLElement)[5]).toBe(fmtEurK(c.setup));
    fireEvent.change(screen.getByLabelText('Filter by wave'), { target: { value: 'none' } });
    expect(screen.getByText('No product in this filter.')).toBeTruthy();
  });

  it('clicking a row, or pressing its name button, makes the product active; the name buttons are keyboard reachable', async () => {
    await open();
    fireEvent.click(row('B'));
    expect(pf().activeProductId).toBe(ids[1]);
    expect(within(table()).getByRole('button', { name: 'B (active product)' }).getAttribute('aria-current')).toBe('true');
    const btn = within(table()).getByRole('button', { name: /^Activate C/ });
    btn.focus();
    expect(document.activeElement).toBe(btn);
    fireEvent.click(btn);
    expect(pf().activeProductId).toBe(ids[2]);
  });

  it('the hub effect by wave sums the product deltas; the diagnostics list unplanned products, capped preparation and an unused hub', async () => {
    await open();
    const t = knowledgeTable(pf()), waves = screen.getByRole('table', { name: /Sum, by wave/ });
    const w1 = [...waves.querySelectorAll('tbody tr')].map((r) => cells(r as HTMLElement))[0]!;
    expect(w1[4]).toBe(fmtEurK(t.byWave[pf().waves[0]!.id] as number));
    expect(screen.getByText(/No diagnostic/)).toBeTruthy();
    act(() => { assignWave(ids[1], null); setProductKnowledge(ids[2], { ktLeadMonths: 9 }); });
    const list = screen.getByRole('list', { name: 'Knowledge transfer diagnostics' });
    expect(within(list).getByText(/B has no wave/)).toBeTruthy();
    expect(within(list).getByText(/lead capped at 6/)).toBeTruthy();
    act(() => { for (const id of ids) setProductKnowledge(id, { enabled: false }); });
    expect(within(screen.getByRole('list', { name: 'Knowledge transfer diagnostics' })).getByText(/no planned product uses it/)).toBeTruthy();
  });

  it('the infra allocation modes show their conservation in the section too', async () => {
    await open();
    act(() => { setPortfolioHub({ infraMonthly: 1000, infraAllocation: 'byBaseEtp' }); });
    expect(document.querySelector('[data-conserved]')!.textContent).toMatch(/the shares add up to the hub cost \(€1,000\.00\/month\)/);
    act(() => { setPortfolioHub({ infraAllocation: 'perProduct' }); });
    expect(document.querySelector('[data-conserved]')!.textContent).toMatch(/3 user\(s\) × €1,000\.00\/month = €3,000\.00/);
  });
});

describe('navigation', () => {
  it('the section is in the Portfolio group from two products on, for every persona, and leaves with the second-to-last product', () => {
    mountApp();
    act(() => openGroup('portfolio'));
    const group = sidebar().querySelector('[data-group="portfolio"]')!;
    expect([...group.querySelectorAll('[data-section]')].map((b) => (b as HTMLElement).dataset.section)).toContain('knowledge-transfer');
    act(() => { removeProduct(ids[1]); removeProduct(ids[2]); });
    expect(sidebar().querySelector('[data-section="knowledge-transfer"]')).toBeNull();
  });
});
