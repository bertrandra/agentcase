// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setEditScope, setActiveProduct } from '@/controllers/product';
import { consolidate, knowledgeRow } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import Knowledge from '@/ui/sections/tune/knowledge';
import { pf } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';
import { freshStore } from '../store/helpers';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
afterEach(cleanup);
const prod = (i: number) => pf().products[i]!;
const rowOf = (i: number) => knowledgeRow(pf(), prod(i).id);
const chip = (name: RegExp) => screen.getByRole('group', { name });
/** Work on product B ("ce produit seulement") with the section open. */
function editB(): void {
  act(() => { setActiveProduct(ids[1]); setEditScope('product'); });
  render(<Knowledge />);
}

describe('Knowledge hub, one product: unchanged', () => {
  beforeEach(() => { freshStore(); });
  it('no chip, no banner, no domains / preparation / hub card; the hub infra field is still there', () => {
    render(<Knowledge />);
    expect(document.querySelector('.ac-ovr, .ac-prod-banner')).toBeNull();
    for (const t of [/Domaines de connaissance/, /Préparation du transfert/, /Knowledge Hub du portefeuille/]) expect(screen.queryByText(t)).toBeNull();
    expect(screen.getByLabelText('Hub infra (€/mo)')).toBeTruthy();
  });
});

describe('Knowledge hub, several products: the subset of the active product', () => {
  beforeEach(() => { ids = threeProducts().ids; });

  it('shows the banner, a chip per field (inherited at first) and the shared hub card instead of the infra field', () => {
    render(<Knowledge />);
    expect(screen.getByText(/Sous-ensemble du Knowledge Hub de/).textContent).toContain('tout est hérité');
    for (const l of ['Utilisation du hub', 'Réponses de maturité', 'Cible CC', 'Base de mise en place', 'Curation', 'Domaines de connaissance', 'Préparation du transfert']) expect(chip(new RegExp(`^${l} : hérité`))).toBeTruthy();
    expect(screen.queryByLabelText('Hub infra (€/mo)')).toBeNull();
    expect(screen.getByLabelText('Infrastructure du hub (€/mois)')).toBeTruthy();
  });

  it('"Tous les produits" edits the common hub, which inherits; "ce produit seulement" creates the product\'s own value, then back to common', () => {
    render(<Knowledge />);
    fireEvent.change(screen.getByLabelText('Target CC (Y3)'), { target: { value: '2' } });
    expect(pf().common.dom.values.khTargetCC).toBe('2');
    expect(prod(1).knowledge.targetCC).toBeUndefined();
    expect(rowOf(1).targetCC).toBe(2);
    cleanup();
    editB();
    fireEvent.change(screen.getByLabelText('Target CC (Y3)'), { target: { value: '1' } });
    expect(prod(1).knowledge.targetCC).toBe(1);
    expect(pf().common.dom.values.khTargetCC).toBe('2');
    expect([rowOf(0).targetCC, rowOf(1).targetCC]).toEqual([2, 1]);
    expect(chip(/^Cible CC : surchargé/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Revenir au commun : Cible CC' }));
    expect(prod(1).knowledge.targetCC).toBeUndefined();
    expect(rowOf(1).targetCC).toBe(2);
    expect(chip(/^Cible CC : hérité/)).toBeTruthy();
  });

  it('editing the answers, target and curation of B never changes the figures of A or C (UI and store level), and Ctrl+Z restores them', () => {
    const before = [rowOf(0), rowOf(2)], docBefore = JSON.stringify(pf().products[1]), consBefore = consolidate(pf());
    editB();
    fireEvent.change(screen.getByLabelText(/Domain knowledge is captured/), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Target CC (Y3)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Curation (FTE)'), { target: { value: '1' } });
    expect(prod(1).knowledge.maturityAnswers).toHaveLength(9);
    expect(prod(1).knowledge.maturityAnswers![1]).toBe(4);
    expect([prod(1).knowledge.targetCC, prod(1).knowledge.curationFTE]).toEqual([1, 1]);
    expect([rowOf(0), rowOf(2)]).toEqual(before);
    expect(rowOf(1).annual).not.toBe(knowledgeRow(pf(), ids[0]).annual);
    const after = consolidate(pf());
    for (const id of [ids[0], ids[2]]) expect(after.products.find((v) => v.id === id)!.run).toBe(consBefore.products.find((v) => v.id === id)!.run);
    for (let i = 0; i < 3; i++) act(() => { appStore().undo(); });
    expect(JSON.stringify(pf().products[1])).toBe(docBefore);
    expect(chip(/^Cible CC : hérité/)).toBeTruthy();
  });

  it('shows the cap of the engagement context next to the target', () => {
    render(<Knowledge />);
    expect(screen.getByText(/Plafond du contexte/).textContent).toMatch(/CC4/);
  });

  it('the hub card sets activation, infrastructure and allocation, and checks the conservation live', () => {
    render(<Knowledge />);
    const card = within(screen.getByRole('region', { name: /Knowledge Hub du portefeuille/ }));
    fireEvent.change(card.getByLabelText('Infrastructure du hub (€/mois)'), { target: { value: '3000' } });
    expect(pf().hub.infraMonthly).toBe(3000);
    expect(card.getByRole('status').textContent).toMatch(/3 utilisateur\(s\) × €3,000\.00\/mois = €9,000\.00/);
    fireEvent.click(card.getByLabelText(/Au prorata de l’effectif d’entrée/));
    expect(pf().hub.infraAllocation).toBe('byBaseEtp');
    expect(card.getByRole('status').textContent).toMatch(/Conservation vérifiée : les parts totalisent le coût du hub \(€3,000\.00\/mois\)/);
    expect(card.getByText('Total des parts').closest('tr')!.textContent).toContain('€3,000.00');
    fireEvent.click(card.getByLabelText('Hub activé par défaut (hérité par les produits)'));
    expect(pf().hub.enabled).toBe(false);
  });
});
