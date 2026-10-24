// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeProduct } from '@/controllers/product';
import { setTeamTotal } from '@/controllers/baseline';
import { exportSnapshotJson } from '@/controllers/files';
import { goSection, openGroup } from '@/ui/uiState';
import { kpi, mountApp, pf, sectionReady, sidebar } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);

describe('top bar with several products', () => {
  it('shows the single View selector (Portfolio, waves, products with wave labels) and the Edit dropdown, default "All products"', () => {
    mountApp();
    const sel = screen.getByRole('combobox', { name: 'View' }) as HTMLSelectElement;
    expect([...sel.options].map((o) => o.textContent)).toEqual(['Portfolio', 'Wave: Wave 1', 'Wave: Wave 2', 'Product: Product 1 — Wave 1', 'Product: B — Wave 1', 'Product: C — Wave 2']);
    expect(sel.value).toBe(`product:${ids[0]}`);
    expect(screen.queryByRole('combobox', { name: 'Display scope' })).toBeNull();
    const edit = screen.getByRole('combobox', { name: 'Edit' }) as HTMLSelectElement;
    expect([...edit.options].map((o) => o.textContent)).toEqual(['All products', 'Product 1 only', 'B only', 'C only']);
    expect(edit.value).toBe('all');
    expect(screen.queryByRole('radiogroup', { name: 'Edit' })).toBeNull();
  });
  it('switching the product changes the KPI figures and the team shown; the choice is saved with the file but is no undo step', async () => {
    mountApp('team-in');
    fireEvent.change(screen.getByRole('combobox', { name: 'View' }), { target: { value: `product:${ids[1]}` } });
    act(() => setTeamTotal(40));
    const total = () => (screen.getByLabelText('Total AS-IS team (FTE)') as HTMLInputElement).value;
    await sectionReady(/Input team/);
    const kpiB = kpi(/^Savings Y/), teamB = total();
    fireEvent.change(screen.getByRole('combobox', { name: 'View' }), { target: { value: `product:${ids[0]}` } });
    expect(total()).not.toBe(teamB);
    expect(kpi(/^Savings Y/)).not.toBe(kpiB);
    expect(screen.getByRole('status').textContent).toContain('View: product Product 1 (edited)');
    expect(JSON.parse(exportSnapshotJson().json).activeProductId).toBe(ids[0]);
    expect(pf().activeProductId).toBe(ids[0]);
    expect(screen.getByText(/Team of:/).textContent).toContain('Product 1');
  });
  it('the Edit dropdown sets the transient edit scope (and the edited product)', () => {
    mountApp();
    fireEvent.change(screen.getByRole('combobox', { name: 'Edit' }), { target: { value: ids[0] } });
    expect(pf().editScope).toBe('product');
    expect(JSON.parse(exportSnapshotJson().json).editScope).toBeUndefined();
    fireEvent.change(screen.getByRole('combobox', { name: 'Edit' }), { target: { value: 'all' } });
    expect(pf().editScope).toBe('all');
  });
  it('the Portfolio group is in the sidebar of every persona with 2+ products and leaves with the second-to-last product', () => {
    mountApp();
    act(() => openGroup('portfolio'));
    const group = sidebar().querySelector('[data-group="portfolio"]')!;
    expect([...group.querySelectorAll('[data-section]')].map((b) => (b as HTMLElement).dataset.section)).toEqual(['products', 'overrides', 'knowledge-transfer', 'waves', 'consolidation', 'portfolio-stress']);
    act(() => { removeProduct(ids[1]); });
    expect(sidebar().querySelector('[data-group="portfolio"]')).toBeTruthy();
    act(() => { removeProduct(ids[2]); });
    expect(sidebar().querySelector('[data-group="portfolio"]')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'View' })).toBeNull();
  });
  it('Welcome lists a Portfolio card with its six sections', async () => {
    mountApp();
    act(() => goSection('home'));
    await screen.findByRole('heading', { level: 1 });
    const card = within(screen.getByRole('main')).getByRole('button', { name: /Portfolio/ });
    expect(card.textContent).toContain('6');   // the count pill: Products, Overrides, Knowledge transfer, Waves, Consolidation and Portfolio stress
  });
});
