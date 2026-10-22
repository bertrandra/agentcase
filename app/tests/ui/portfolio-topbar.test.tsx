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
  it('shows the Produit selector (names and wave labels) and the Modifier toggle, default "Tous les produits"', () => {
    mountApp();
    const sel = screen.getByRole('combobox', { name: 'Produit' }) as HTMLSelectElement;
    expect([...sel.options].map((o) => o.textContent)).toEqual(['Produit 1 — Vague 1', 'B — Vague 1', 'C — Wave 2']);
    expect(sel.value).toBe(ids[0]);
    const group = screen.getByRole('radiogroup', { name: 'Modifier' });
    expect((within(group).getByLabelText('Tous les produits') as HTMLInputElement).checked).toBe(true);
    expect((within(group).getByLabelText('Ce produit seulement') as HTMLInputElement).checked).toBe(false);
  });
  it('switching the product changes the KPI figures and the team shown; the choice is saved with the file but is no undo step', async () => {
    mountApp('team-in');
    fireEvent.change(screen.getByRole('combobox', { name: 'Produit' }), { target: { value: ids[1] } });
    act(() => setTeamTotal(40));
    const total = () => (screen.getByLabelText('Total AS-IS team (FTE)') as HTMLInputElement).value;
    await sectionReady(/Input team/);
    const kpiB = kpi(/^Savings Y/), teamB = total();
    fireEvent.change(screen.getByRole('combobox', { name: 'Produit' }), { target: { value: ids[0] } });
    expect(total()).not.toBe(teamB);
    expect(kpi(/^Savings Y/)).not.toBe(kpiB);
    expect(screen.getByRole('status').textContent).toContain('Produit actif');
    expect(JSON.parse(exportSnapshotJson().json).activeProductId).toBe(ids[0]);
    expect(pf().activeProductId).toBe(ids[0]);
    expect(screen.getByText(/Équipe de :/).textContent).toContain('Produit 1');
  });
  it('the edit scope toggle sets the transient edit scope', () => {
    mountApp();
    fireEvent.click(screen.getByLabelText('Ce produit seulement'));
    expect(pf().editScope).toBe('product');
    expect(JSON.parse(exportSnapshotJson().json).editScope).toBeUndefined();
    fireEvent.click(screen.getByLabelText('Tous les produits'));
    expect(pf().editScope).toBe('all');
  });
  it('the Portefeuille group is in the sidebar of every persona with 2+ products and leaves with the second-to-last product', () => {
    mountApp();
    act(() => openGroup('portfolio'));
    const group = sidebar().querySelector('[data-group="portfolio"]')!;
    expect([...group.querySelectorAll('[data-section]')].map((b) => (b as HTMLElement).dataset.section)).toEqual(['products', 'overrides', 'knowledge-transfer', 'waves', 'consolidation']);
    act(() => { removeProduct(ids[1]); });
    expect(sidebar().querySelector('[data-group="portfolio"]')).toBeTruthy();
    act(() => { removeProduct(ids[2]); });
    expect(sidebar().querySelector('[data-group="portfolio"]')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Produit' })).toBeNull();
  });
  it('Welcome lists a Portefeuille card with its five sections', async () => {
    mountApp();
    act(() => goSection('home'));
    await screen.findByRole('heading', { level: 1 });
    const card = within(screen.getByRole('main')).getByRole('button', { name: /Portefeuille/ });
    expect(card.textContent).toContain('5');   // the count pill: Produits, Surcharges, Knowledge transfer, Vagues and Consolidation
  });
});
