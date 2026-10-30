// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setProductOverride } from '@/controllers/productOverrides';
import { isOverridden } from '@/domain/portfolio';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';
import { keysOf, setScopeOverride } from '../helpers/scope';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const panel = (name: RegExp) => within(screen.getByRole('region', { name }));

describe('Overrides section', () => {
  it('lists, per product, the overridden keys with the common and the product value', async () => {
    setScopeOverride(ids[1], { regInclude: true });
    setProductOverride(ids[1], 'values.engagementCtx', 'STA');
    mountApp('overrides');
    await sectionReady(/Overrides/);
    expect(panel(/^Product 1/).getByText(/No override/)).toBeTruthy();
    const b = panel(/^B/);
    expect(b.getAllByRole('row')).toHaveLength(3);   // header + 2 keys
    const r = b.getByText('Process (scope, phases, artefact parameters, norms, skill map)').closest('tr')!;
    expect(r.textContent).toContain('regulatory in the effort: yes');   // the product's process document (F-B20)
    expect(within(b.getByText('Field engagementCtx').closest('tr')!).getByText('STA')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^B — 2 overrides$/ })).toBeTruthy();
  });
  it('"Revert to common" and "Apply to all products" act on the row; the row leaves the list', async () => {
    setScopeOverride(ids[1], { regInclude: true });
    setScopeOverride(ids[2], { regInclude: true });
    setProductOverride(ids[1], 'values.engagementCtx', 'STA');
    mountApp('overrides');
    await sectionReady(/Overrides/);
    fireEvent.click(screen.getByRole('button', { name: /^Revert to common: Field engagementCtx \(B\)/ }));
    expect(isOverridden(pf().products[1]!, 'values.engagementCtx')).toBe(false);
    expect(panel(/^B/).queryByText('Field engagementCtx')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Apply to all products: Process \(scope, phases, artefact parameters, norms, skill map\) \(B\)/ }));
    expect(keysOf(pf().common).regInclude).toBe(true);
    expect(pf().products.every((p) => !isOverridden(p, 'BPMN'))).toBe(true);   // C's identical override is dropped too
    expect(panel(/^B/).getByText(/No override/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('applied to all');
  });
});
