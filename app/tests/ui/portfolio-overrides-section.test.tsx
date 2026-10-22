// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setProductOverride } from '@/controllers/productOverrides';
import { isOverridden } from '@/domain/portfolio';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const panel = (name: RegExp) => within(screen.getByRole('region', { name }));

describe('Surcharges section', () => {
  it('lists, per product, the overridden keys with the common and the product value', async () => {
    setProductOverride(ids[1], 'regInclude', true);
    setProductOverride(ids[1], 'values.engagementCtx', 'STA');
    mountApp('overrides');
    await sectionReady(/Surcharges/);
    expect(panel(/^Produit 1/).getByText(/Aucune surcharge/)).toBeTruthy();
    const b = panel(/^B/);
    expect(b.getAllByRole('row')).toHaveLength(3);   // header + 2 keys
    const r = b.getByText('Inclure le réglementaire dans l’effort').closest('tr')!;
    expect(r.textContent).toContain('true');
    expect(within(b.getByText('Champ engagementCtx').closest('tr')!).getByText('STA')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^B — 2 surcharges$/ })).toBeTruthy();
  });
  it('"Revenir au commun" and "Appliquer à tous les produits" act on the row; the row leaves the list', async () => {
    setProductOverride(ids[1], 'regInclude', true);
    setProductOverride(ids[2], 'regInclude', true);
    setProductOverride(ids[1], 'values.engagementCtx', 'STA');
    mountApp('overrides');
    await sectionReady(/Surcharges/);
    fireEvent.click(screen.getByRole('button', { name: /^Revenir au commun : Champ engagementCtx \(B\)/ }));
    expect(isOverridden(pf().products[1]!, 'values.engagementCtx')).toBe(false);
    expect(panel(/^B/).queryByText('Champ engagementCtx')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Appliquer à tous les produits : Inclure le réglementaire dans l’effort \(B\)/ }));
    expect(pf().common.regInclude).toBe(true);
    expect(pf().products.every((p) => !isOverridden(p, 'regInclude'))).toBe(true);   // C's identical override is dropped too
    expect(panel(/^B/).getByText(/Aucune surcharge/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('appliqué à tous');
  });
});
