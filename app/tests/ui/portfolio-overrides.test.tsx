// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { undo } from '@/controllers/history';
import { isOverridden, resolveProduct } from '@/domain/portfolio';
import { goSection } from '@/ui/uiState';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const chip = (label: string) => screen.getByRole('group', { name: new RegExp(`^${label} : `) });
const prod = (i: number) => pf().products[i]!;

describe('inherited / overridden fields on a section that edits overridable data', () => {
  it('banner "Produit : X (hérité)" and "hérité" chips with the common value in the tooltip', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    expect(document.querySelector('.ac-prod-banner')!.textContent).toMatch(/Produit : Produit 1 \(hérité\)/);
    expect(chip('Artefacts SDLC retenus').textContent).toContain('hérité');
    expect(chip('Artefacts SDLC retenus').querySelector('.ac-ovr-chip')!.getAttribute('title')).toMatch(/^Valeur commune : \d+ éléments?$/);
    expect(screen.queryByRole('button', { name: /Revenir au commun/ })).toBeNull();
  });
  it('"Tous les produits" (default) edits the common values: every product follows, nothing is overridden', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(prod(0).overrides).toEqual({});
    expect(resolveProduct(pf(), ids[1]).selectedArtefacts).toEqual(pf().common.selectedArtefacts);
    expect(chip('Artefacts SDLC retenus').textContent).toContain('hérité');
  });
  it('"Ce produit seulement" creates overrides, the chip says "surchargé", "Revenir au commun" restores, undo works', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    const commonBefore = pf().common.selectedArtefacts;
    fireEvent.click(screen.getByLabelText('Ce produit seulement'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(isOverridden(prod(0), 'selectedArtefacts')).toBe(true);
    expect(pf().common.selectedArtefacts).toBe(commonBefore);
    expect(resolveProduct(pf(), ids[1]).selectedArtefacts).toEqual(commonBefore);   // product B is untouched
    expect(chip('Artefacts SDLC retenus').textContent).toContain('surchargé');
    expect(document.querySelector('.ac-prod-banner')!.textContent).toMatch(/\d+ surcharges? dans cette section/);
    fireEvent.click(screen.getByRole('button', { name: /^Revenir au commun : Artefacts SDLC retenus/ }));
    expect(isOverridden(prod(0), 'selectedArtefacts')).toBe(false);
    expect(chip('Artefacts SDLC retenus').textContent).toContain('hérité');
    expect(screen.getByRole('status').textContent).toContain('retour au commun');
    act(() => { undo(); });
    expect(isOverridden(prod(0), 'selectedArtefacts')).toBe(true);
  });
  it('"Appliquer à tous les produits" makes the product value the common one and drops identical overrides', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    fireEvent.click(screen.getByLabelText('Ce produit seulement'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    const mine = prod(0).overrides.selectedArtefacts;
    fireEvent.click(screen.getByRole('button', { name: /^Appliquer à tous les produits : Artefacts SDLC retenus/ }));
    expect(pf().common.selectedArtefacts).toEqual(mine);
    expect(isOverridden(prod(0), 'selectedArtefacts')).toBe(false);
    expect(resolveProduct(pf(), ids[2]).selectedArtefacts).toEqual(mine);
    expect(chip('Artefacts SDLC retenus').textContent).toContain('hérité');
  });
  it('the other wired sections show their badges (phase scope, S-curve, engagement context, norms, location mix)', async () => {
    mountApp('phase-scope');
    await sectionReady(/Phase scope/);
    expect(chip('Phases désactivées')).toBeTruthy();
    for (const [id, label] of [['scurve', 'Courbe en S'], ['engagement-context', 'Contexte d’engagement'], ['loc-strat', 'Mix cible de localisation']] as const) {
      act(() => goSection(id));
      await screen.findByRole('heading', { level: 1, name: new RegExp(id === 'scurve' ? 'S-curve' : id === 'loc-strat' ? 'Location' : 'Engagement') });
      expect(chip(label).textContent).toContain('hérité');
    }
  });
});
