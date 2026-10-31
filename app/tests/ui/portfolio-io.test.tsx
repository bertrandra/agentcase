// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { axeViolations } from '../helpers/axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addProduct } from '@/controllers/product';
import { setDisplayScope } from '@/controllers/displayScope';
import { mountApp, sectionReady } from '../helpers/portfolioUi';
import { regulatedPortfolio } from '../helpers/portfolioFixtures';
import { freshStore } from '../store/helpers';

const saved: { filename: string; text: string }[] = [];
vi.mock('@/ui/sections/refshare/download', () => ({ downloadText: (filename: string, text: string) => { saved.push({ filename, text }); } }));
vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

beforeEach(() => { saved.length = 0; });
afterEach(cleanup);
const open = async (tab?: RegExp) => {
  mountApp('io'); await sectionReady(/Import \/ Export/);
  if (tab) fireEvent.click(screen.getByRole('tab', { name: tab }));
};
const NOTE = /Portfolio: what the/;

describe('Import / Export with one product: unchanged', () => {
  it('no portfolio note on the settings and results tabs, no report scope selector', async () => {
    freshStore();
    await open(/Export \/ Import current settings/);
    expect(screen.queryByText(NOTE)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Results workbook/ }));
    expect(screen.queryByText(NOTE)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Save HTML/ }));
    expect(screen.queryByRole('combobox', { name: 'Report scope' })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Add to the parameters workbook|PortfolioSettings/);
  });
});

describe('Import / Export with a portfolio', () => {
  it('lists the sheets the parameters workbook and the results workbook gain', async () => {
    freshStore(); addProduct('Second');
    await open(/Export \/ Import current settings/);
    const note = screen.getByText(/Portfolio: what the parameters workbook contains/).closest('div')!;
    for (const sheet of ['PortfolioSettings', 'Products', 'Waves', 'TeamIn', 'Overrides', 'KnowledgeSubsets',
      'KnowledgeDomains']) expect(note.textContent).toContain(sheet);
    expect(within(note).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
    fireEvent.click(screen.getByRole('tab', { name: /Results workbook/ }));
    expect(screen.getByText(/Portfolio: what the results workbook contains/)).toBeTruthy();
  });
  it('the report scope selector offers the portfolio, each wave and each product; it starts on the display scope', async () => {
    regulatedPortfolio(); setDisplayScope({ kind: 'portfolio' });
    await open(/Save HTML/);
    const sel = screen.getByRole('combobox', { name: 'Report scope' }) as HTMLSelectElement;
    expect([...sel.options].map((o) => o.textContent)).toEqual(['Portfolio', 'Wave: Wave 1', 'Wave: Wave 2', 'Unit: Delivery', 'Unit: Unassigned',
      'Product: Product 1', 'Product: Payroll',
      'Product: Billing', 'Product: Archive (no wave)']);
    expect(sel.value).toBe('portfolio');
  });
  it('exports the report of the chosen scope', async () => {
    regulatedPortfolio();
    await open(/Save HTML/);
    const sel = screen.getByRole('combobox', { name: 'Report scope' }), run =
      () => fireEvent.click(screen.getByRole('button', { name: /Export critical-delivery report/ }));
    fireEvent.change(sel, { target: { value: 'portfolio' } }); run();
    expect(saved.at(-1)!.filename).toMatch(/Report_Portfolio_/);
    expect(saved.at(-1)!.text).toContain('Model — Portfolio');
    fireEvent.change(sel, { target:
      { value: 'wave:' + (document.querySelector('option[value^="wave:"]:nth-of-type(2)') as HTMLOptionElement).value.slice(5) } }); run();
    expect(saved.at(-1)!.filename).toMatch(/Report_Wave_Wave_2_/);
    const paie = [...(sel as HTMLSelectElement).options].find((o) => o.textContent === 'Product: Payroll')!;
    fireEvent.change(sel, { target: { value: paie.value } }); run();
    expect(saved.at(-1)!.filename).not.toMatch(/Portfolio|Wave/);
    expect(saved.at(-1)!.text).not.toContain('Model — Portfolio');
    expect(await screen.findByText(/Report generated/)).toBeTruthy();
  });
  it('a refusal (no regulatory catalogue) is announced, not downloaded', async () => {
    freshStore(); addProduct('Second');
    await open(/Save HTML/);
    fireEvent.click(screen.getByRole('button', { name: /Export critical-delivery report/ }));
    expect(saved).toHaveLength(0);
    expect(await screen.findByText(/Enable the Regulatory catalog/)).toBeTruthy();
  });
  it('has no accessibility violation', async () => {
    freshStore(); addProduct('Second');
    await open(/Export \/ Import current settings/);
    expect(await axeViolations(document.body, { region: false })).toEqual([]);
  });
});
