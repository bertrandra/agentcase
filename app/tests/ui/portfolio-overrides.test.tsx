// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { undo } from '@/controllers/history';
import { isOverridden, resolveProduct } from '@/domain/portfolio';
import { goSection } from '@/ui/uiState';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';
import { keysOf } from '../helpers/scope';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const chip = (label: string) => screen.getByRole('group', { name: new RegExp(`^${label.replace(/[()]/g, '\\$&')}: `) });
const prod = (i: number) => pf().products[i]!;

describe('inherited / overridden fields on a section that edits overridable data', () => {
  it('banner "Product: X (inherited)" and "inherited" chips with the common value in the tooltip', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    expect(document.querySelector('.ac-prod-banner')!.textContent).toMatch(/Product: Product 1 \(inherited\)/);
    expect(chip('Process (artefacts in scope)').textContent).toContain('inherited');
    expect(chip('Process (artefacts in scope)').querySelector('.ac-ovr-chip')!.getAttribute('title'))
      .toMatch(/^Common value: process: \d+ SDLC \+ \d+ regulatory artefacts in scope/);
    expect(screen.queryByRole('button', { name: /Revert to common/ })).toBeNull();
  });
  it('"All products" (default) edits the common values: every product follows, nothing is overridden', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(prod(0).overrides).toEqual({});
    expect(keysOf(resolveProduct(pf(), ids[1])).selectedArtefacts).toEqual(keysOf(pf().common).selectedArtefacts);
    expect(chip('Process (artefacts in scope)').textContent).toContain('inherited');
  });
  it('"This product only" creates overrides, the chip says "overridden", "Revert to common" restores, undo works', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    const commonBefore = keysOf(pf().common).selectedArtefacts;
    fireEvent.change(screen.getByRole('combobox', { name: 'Change' }), { target: { value: ids[0] } });   // Change: Product 1
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(isOverridden(prod(0), 'BPMN')).toBe(true);
    expect(keysOf(pf().common).selectedArtefacts).toBe(commonBefore);
    expect(keysOf(resolveProduct(pf(), ids[1])).selectedArtefacts).toEqual(commonBefore);   // product B is untouched
    expect(chip('Process (artefacts in scope)').textContent).toContain('overridden');
    expect(document.querySelector('.ac-prod-banner')!.textContent).toMatch(/\d+ overrides? in this section/);
    fireEvent.click(screen.getByRole('button', { name: /^Revert to common: Process \(artefacts in scope\)/ }));
    expect(isOverridden(prod(0), 'BPMN')).toBe(false);
    expect(chip('Process (artefacts in scope)').textContent).toContain('inherited');
    expect(screen.getByRole('status').textContent).toContain('reverted to common');
    act(() => { undo(); });
    expect(isOverridden(prod(0), 'BPMN')).toBe(true);
  });
  it('"Apply to all products" makes the product value the common one and drops identical overrides', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    fireEvent.change(screen.getByRole('combobox', { name: 'Change' }), { target: { value: ids[0] } });   // Change: Product 1
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    const mine = keysOf({ BPMN: prod(0).overrides.BPMN! }).selectedArtefacts;
    fireEvent.click(screen.getByRole('button', { name: /^Apply to all products: Process \(artefacts in scope\)/ }));
    expect(keysOf(pf().common).selectedArtefacts).toEqual(mine);
    expect(isOverridden(prod(0), 'BPMN')).toBe(false);
    expect(keysOf(resolveProduct(pf(), ids[2])).selectedArtefacts).toEqual(mine);
    expect(chip('Process (artefacts in scope)').textContent).toContain('inherited');
  });
  it('the other wired sections show their badges (phase scope, S-curve, engagement context, norms, location mix)', async () => {
    mountApp('phase-scope');
    await sectionReady(/Phase scope/);
    expect(chip('Process (phases and artefacts in scope)')).toBeTruthy();
    for (const [id, label] of [['scurve', 'S-curve'], ['engagement-context', 'Engagement context'], ['loc-strat', 'Target location mix']] as const) {
      act(() => goSection(id));
      await screen.findByRole('heading', { level: 1, name: new RegExp(id === 'scurve' ? 'S-curve' : id === 'loc-strat' ? 'Location' : 'Engagement') });
      expect(chip(label).textContent).toContain('inherited');
    }
  });
});
