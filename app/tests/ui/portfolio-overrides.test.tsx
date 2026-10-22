// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { undo } from '@/controllers/history';
import { isOverridden, resolveProduct } from '@/domain/portfolio';
import { goSection } from '@/ui/uiState';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const chip = (label: string) => screen.getByRole('group', { name: new RegExp(`^${label}: `) });
const prod = (i: number) => pf().products[i]!;

describe('inherited / overridden fields on a section that edits overridable data', () => {
  it('banner "Product: X (inherited)" and "inherited" chips with the common value in the tooltip', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    expect(document.querySelector('.ac-prod-banner')!.textContent).toMatch(/Product: Product 1 \(inherited\)/);
    expect(chip('Selected SDLC artefacts').textContent).toContain('inherited');
    expect(chip('Selected SDLC artefacts').querySelector('.ac-ovr-chip')!.getAttribute('title')).toMatch(/^Common value: \d+ items?$/);
    expect(screen.queryByRole('button', { name: /Revert to common/ })).toBeNull();
  });
  it('"All products" (default) edits the common values: every product follows, nothing is overridden', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(prod(0).overrides).toEqual({});
    expect(resolveProduct(pf(), ids[1]).selectedArtefacts).toEqual(pf().common.selectedArtefacts);
    expect(chip('Selected SDLC artefacts').textContent).toContain('inherited');
  });
  it('"This product only" creates overrides, the chip says "overridden", "Revert to common" restores, undo works', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    const commonBefore = pf().common.selectedArtefacts;
    fireEvent.click(screen.getByLabelText('This product only'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(isOverridden(prod(0), 'selectedArtefacts')).toBe(true);
    expect(pf().common.selectedArtefacts).toBe(commonBefore);
    expect(resolveProduct(pf(), ids[1]).selectedArtefacts).toEqual(commonBefore);   // product B is untouched
    expect(chip('Selected SDLC artefacts').textContent).toContain('overridden');
    expect(document.querySelector('.ac-prod-banner')!.textContent).toMatch(/\d+ overrides? in this section/);
    fireEvent.click(screen.getByRole('button', { name: /^Revert to common: Selected SDLC artefacts/ }));
    expect(isOverridden(prod(0), 'selectedArtefacts')).toBe(false);
    expect(chip('Selected SDLC artefacts').textContent).toContain('inherited');
    expect(screen.getByRole('status').textContent).toContain('reverted to common');
    act(() => { undo(); });
    expect(isOverridden(prod(0), 'selectedArtefacts')).toBe(true);
  });
  it('"Apply to all products" makes the product value the common one and drops identical overrides', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    fireEvent.click(screen.getByLabelText('This product only'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    const mine = prod(0).overrides.selectedArtefacts;
    fireEvent.click(screen.getByRole('button', { name: /^Apply to all products: Selected SDLC artefacts/ }));
    expect(pf().common.selectedArtefacts).toEqual(mine);
    expect(isOverridden(prod(0), 'selectedArtefacts')).toBe(false);
    expect(resolveProduct(pf(), ids[2]).selectedArtefacts).toEqual(mine);
    expect(chip('Selected SDLC artefacts').textContent).toContain('inherited');
  });
  it('the other wired sections show their badges (phase scope, S-curve, engagement context, norms, location mix)', async () => {
    mountApp('phase-scope');
    await sectionReady(/Phase scope/);
    expect(chip('Disabled phases')).toBeTruthy();
    for (const [id, label] of [['scurve', 'S-curve'], ['engagement-context', 'Engagement context'], ['loc-strat', 'Target location mix']] as const) {
      act(() => goSection(id));
      await screen.findByRole('heading', { level: 1, name: new RegExp(id === 'scurve' ? 'S-curve' : id === 'loc-strat' ? 'Location' : 'Engagement') });
      expect(chip(label).textContent).toContain('inherited');
    }
  });
});
