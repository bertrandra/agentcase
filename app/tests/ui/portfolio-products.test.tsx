// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setProductOverride } from '@/controllers/productOverrides';
import { computeCase } from '@/domain';
import { resolveProduct } from '@/domain/portfolio';
import { fmtEurK } from '@/ui/format';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const rows = () => [...document.querySelectorAll<HTMLElement>('tr[data-product]')];
const row = (id: string) => within(document.querySelector<HTMLElement>(`tr[data-product="${id}"]`)!);
const undoKey = () => fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });

describe('Products section', () => {
  it('one row per product with wave, base team, state and the indicators of its own effective case', async () => {
    setProductOverride(ids[1], 'regInclude', true);
    mountApp('products');
    await sectionReady(/Products/);
    expect(rows()).toHaveLength(3);
    const b = row(ids[1]).getByText(/override/);
    expect(b.textContent).toBe('1 override');
    const r = computeCase(resolveProduct(pf(), ids[1]));
    expect(rows()[1]!.textContent).toContain(fmtEurK(r.endYear.savings));
    expect(rows()[1]!.textContent).toContain(r.model.base.etp.toFixed(1));
    expect(rows()[0]!.textContent).toContain('inherited');
    expect(rows()[2]!.textContent).toContain('Wave 2');
  });
  it('rename, offset, note, activate, duplicate, archive / restore', async () => {
    mountApp('products');
    await sectionReady(/Products/);
    const name = screen.getByLabelText('Name of product no. 2');
    fireEvent.change(name, { target: { value: '  Payroll ' } });
    fireEvent.blur(name);
    expect(pf().products[1]!.name).toBe('Payroll');
    fireEvent.change(screen.getByLabelText('Offset in months of product no. 2'), { target: { value: '3' } });
    expect(pf().products[1]!.offsetMonths).toBe(3);
    const note = screen.getByLabelText('Note of product no. 3');
    fireEvent.change(note, { target: { value: 'Wave 2' } });
    fireEvent.keyDown(note, { key: 'Enter' });
    expect(pf().products[2]!.note).toBe('Wave 2');
    fireEvent.click(screen.getByRole('button', { name: 'Activate C' }));
    expect(pf().activeProductId).toBe(ids[2]);
    expect(rows()[2]!.className).toContain('is-active');
    fireEvent.click(screen.getByRole('button', { name: 'Dupliquer C' }));
    expect(rows()).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Archive Payroll' }));
    expect(pf().products[1]!.archived).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Restore Payroll' }));
    expect(pf().products[1]!.archived).toBeUndefined();
  });
  it('add a product (inherits the common values, joins the first wave); remove it; Ctrl+Z restores the removed product', async () => {
    mountApp('products');
    await sectionReady(/Products/);
    fireEvent.change(screen.getByLabelText('Name of the new product'), { target: { value: 'New' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add a product' }));
    expect(rows()).toHaveLength(4);
    const added = pf().products[3]!;
    expect(added.name).toBe('New');
    expect(added.overrides).toEqual({});
    expect(added.waveId).toBe(pf().waves[0]!.id);
    fireEvent.click(screen.getByRole('button', { name: 'Delete New' }));
    expect(rows()).toHaveLength(3);
    expect(screen.getByRole('status').textContent).toContain('Ctrl+Z');
    act(() => undoKey());
    expect(rows()).toHaveLength(4);
    expect(pf().products[3]!.name).toBe('New');
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(rows()).toHaveLength(3);
  });
  it('the last product cannot be removed', async () => {
    mountApp('products');
    await sectionReady(/Products/);
    fireEvent.click(screen.getByRole('button', { name: 'Delete C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete B' }));
    expect(pf().products).toHaveLength(1);
    expect((screen.getByRole('button', { name: /^Delete Product 1/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
