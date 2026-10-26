// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { axeViolations } from '../helpers/axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { setActiveProduct } from '@/controllers/product';
import { uiStore } from '@/ui/uiState';
import { mountApp, sectionReady } from '../helpers/portfolioUi';
import { fourProducts, pfNow } from '../helpers/portfolioFixtures';
import { freshStore } from '../store/helpers';
import { appVerFileTag } from '@/domain/snapshots';

const saved: { filename: string; blob: Blob }[] = [];
vi.mock('@/ui/sections/refshare/download',
  () => ({ downloadText: () => undefined, downloadBlob: (filename: string, blob: Blob) => { saved.push({ filename, blob }); } }));
vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

beforeEach(() => { saved.length = 0; uiStore.setState({ toast: '' }); });
afterEach(cleanup);
const open = async () => {
  mountApp('io'); await sectionReady(/Import \/ Export/);
  fireEvent.click(screen.getByRole('tab', { name: /Results workbook/ }));
};
const scope = () => screen.getByRole('combobox', { name: 'Cost model scope' }) as HTMLSelectElement;
const exportBtn = () => screen.getByRole('button', { name: /Export cost model \(\.xlsx\)/ });

describe('Import / Export: Cost model (monthly)', () => {
  it('with one product: the option explains the three tabs and t0, and only that product is offered', async () => {
    freshStore();
    await open();
    expect(screen.getByText('💶 Cost model (monthly)')).toBeTruthy();
    for (const t of ['Values', 'Rate cards', 'Other costs']) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0);
    expect(document.body.textContent).toMatch(/t0/); expect(document.body.textContent).toMatch(/earlier cells are empty, not zero/);
    expect([...scope().options].map((o) => o.textContent)).toEqual(['Product: Product 1']);
    fireEvent.click(exportBtn());
    await waitFor(() => expect(saved.length).toBe(1));
    expect(saved[0]!.filename).toMatch(
      new RegExp(String.raw`^AgentCase_${appVerFileTag()}_CostModel_Product_Product_1_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.xlsx$`));
    expect(saved[0]!.blob.size).toBeGreaterThan(5000);
  });
  it('with a portfolio: Portfolio, each wave and each product, starting on the current View', async () => {
    fourProducts(); setDisplayScope({ kind: 'portfolio' });
    await open();
    expect([...scope().options].map((o) => o.textContent)).toEqual(['Portfolio', 'Wave: Wave 1', 'Wave: Wave 2', 'Product: Product 1', 'Product: Payroll',
      'Product: Billing', 'Product: Archive (no wave) (no wave)']);
    expect(scope().value).toBe('portfolio');
    expect((within(scope()).getByRole('option', { name: /Archive/ }) as HTMLOptionElement).disabled).toBe(true);
  });
  it('defaults to the displayed wave or product, exports it and shows the toast', async () => {
    fourProducts();
    const w2 = pfNow().waves[1]!.id, billing = pfNow().products[2]!.id;
    setDisplayScope({ kind: 'wave', id: w2 });
    await open();
    expect(scope().value).toBe(`wave:${w2}`);
    fireEvent.click(exportBtn());
    await waitFor(() => expect(saved.length).toBe(1));
    expect(saved[0]!.filename).toMatch(/CostModel_Wave_Wave_2_/);
    expect(uiStore.getState().toast).toMatch(new RegExp(String.raw`^Exported AgentCase_${appVerFileTag()}_CostModel_Wave_Wave_2_`));
    expect(screen.getAllByRole('status').some((s) => /^Exported /.test(s.textContent ?? ''))).toBe(true);
    cleanup(); setDisplayScope({ kind: 'product' }); setActiveProduct(billing);
    await open();
    expect(scope().value).toBe(`product:${billing}`);
    fireEvent.change(scope(), { target: { value: 'portfolio' } });
    fireEvent.click(exportBtn());
    await waitFor(() => expect(saved.length).toBe(2));
    expect(saved[1]!.filename).toMatch(/CostModel_Portfolio_/);
  });
  it('is accessible and shows an error toast when nothing can be exported', async () => {
    fourProducts();
    await open();
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.change(scope(), { target: { value: 'wave:missing' } });
    fireEvent.click(exportBtn());
    await waitFor(() => expect(uiStore.getState().toast).toMatch(/^Export failed: /));
    expect(saved.length).toBe(0);
  });
});
