// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { setProductKnowledge, setProductOverride } from '@/controllers/productOverrides';
import { resolveProduct } from '@/domain/portfolio';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const region = () => screen.getByRole('region', { name: /^Edit in place: All products/ });
const vals = (i: number) => (resolveProduct(pf(), ids[i]!) as unknown as { dom: { values: Record<string, string> } }).dom.values;

describe('"Edit: All products" in place: form fields', () => {
  it('a number field edits the common value: inheriting products follow; the overriding product is named, keeps its value, and can be reset', async () => {
    setProductOverride(ids[2], 'values.pilotFte', '5');
    mountApp('program'); act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await sectionReady(/Program & Completeness/);
    const r = region(), note = await within(r).findByRole('note', { name: 'Pilot pod size (FTE): 1 product overrides this' }, { timeout: 15000 });
    expect(note.textContent).toContain('1 product overrides this: C — it keeps its value');
    fireEvent.change(within(r).getByLabelText('Pilot pod size (FTE)'), { target: { value: '3' } });
    expect(pf().common.dom.values.pilotFte).toBe('3');
    expect([vals(0).pilotFte, vals(1).pilotFte, vals(2).pilotFte]).toEqual(['3', '3', '5']);
    expect(within(r).getByLabelText('Pilot pod size (FTE)')).toHaveProperty('value', '3');   // the editor shows the common value
    fireEvent.click(within(r).getByRole('button', { name: 'Reset to common: Pilot pod size (FTE) for C' }));
    expect(vals(2).pilotFte).toBe('3');
    expect(screen.getByRole('status').textContent).toContain('C reset to common');
  });
  it('Knowledge hub: the common hub with the products that keep their own subset field; domains and preparation are per product', async () => {
    setProductKnowledge(ids[1], { targetCC: 3 });
    mountApp('knowledge'); act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await sectionReady(/Knowledge hub/);
    const r = region();
    expect((await within(r).findByRole('note', { name: 'Target CC: 1 product overrides this' }, { timeout: 15000 })).textContent).toContain('B');
    expect(within(r).getByText(/knowledge domains and the knowledge transfer preparation are per product/)).toBeTruthy();
    expect(within(r).queryByRole('button', { name: 'Save the domains' })).toBeNull();
    expect(within(r).getAllByRole('note', { name: /overrides? this/ })).toHaveLength(1);   // one notice per field, not one per form control
  });
});
