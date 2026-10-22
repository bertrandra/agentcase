// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setActiveProduct, setEditScope } from '@/controllers/product';
import { consolidate } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import Knowledge from '@/ui/sections/tune/knowledge';
import { pf } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const prod = (i: number) => pf().products[i]!;
function openFor(i: number): void {
  act(() => { setActiveProduct(ids[i]!); setEditScope('product'); });
  render(<Knowledge />);
}
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('Domaines de connaissance', () => {
  it('free label + weight rows; the weights must add up to 100 (the remaining % is shown), an invalid list is refused and announced', () => {
    openFor(1);
    const add = () => fireEvent.click(screen.getByRole('button', { name: 'Ajouter un domaine' }));
    add();
    type('Libellé du domaine 1', 'Documentation'); type('Poids du domaine 1 (%)', '40');
    expect(screen.getByText('Reste 60 % à répartir.')).toBeTruthy();
    add();
    expect((screen.getByLabelText('Poids du domaine 2 (%)') as HTMLInputElement).value).toBe('60');
    type('Libellé du domaine 2', 'Code'); type('Poids du domaine 2 (%)', '50');
    expect(screen.getByText('Reste 10 % à répartir.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les domaines' }));
    expect(screen.getByRole('alert').textContent).toMatch(/totaliser 100 % \(il reste 10 %\)/);
    expect(prod(1).knowledge.domains).toBeUndefined();
    type('Poids du domaine 2 (%)', '70');
    expect(screen.getByText('10 % de trop.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les domaines' }));
    expect(screen.getByRole('alert').textContent).toMatch(/10 % de trop/);
    type('Poids du domaine 2 (%)', '60');
    expect(screen.getByText('Total : 100 % — prêt à enregistrer.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les domaines' }));
    expect(prod(1).knowledge.domains).toEqual([{ label: 'Documentation', weightPct: 40 }, { label: 'Code', weightPct: 60 }]);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('group', { name: 'Domaines de connaissance : surchargé' })).toBeTruthy();
    expect(prod(0).knowledge.domains).toBeUndefined();
  });

  it('an empty label is refused; a row can be removed; "Retirer tous" and Ctrl+Z', () => {
    openFor(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un domaine' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les domaines' }));
    expect(screen.getByRole('alert').textContent).toMatch(/libellé/);
    type('Libellé du domaine 1', 'Tickets');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les domaines' }));
    expect(prod(1).knowledge.domains).toEqual([{ label: 'Tickets', weightPct: 100 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Retirer tous les domaines' }));
    expect(prod(1).knowledge.domains).toBeUndefined();
    act(() => { appStore().undo(); });
    expect(prod(1).knowledge.domains).toHaveLength(1);
    expect((screen.getByLabelText('Libellé du domaine 1') as HTMLInputElement).value).toBe('Tickets');
    fireEvent.click(screen.getByRole('button', { name: 'Retirer le domaine Tickets' }));
    expect(screen.queryByLabelText('Libellé du domaine 1')).toBeNull();
  });
});

describe('Préparation du transfert (mois avant la vague)', () => {
  const FIELD = 'Préparation du transfert (mois avant la vague)';

  it('refuses a negative or fractional number, announces it, and keeps the document unchanged', () => {
    openFor(2);
    type(FIELD, '-1');
    fireEvent.blur(screen.getByLabelText(FIELD));
    expect(screen.getByRole('alert').textContent).toMatch(/entier de mois supérieur ou égal à 0/);
    expect(prod(2).knowledge.ktLeadMonths).toBeUndefined();
    type(FIELD, '1.5');
    fireEvent.blur(screen.getByLabelText(FIELD));
    expect(prod(2).knowledge.ktLeadMonths).toBeUndefined();
  });

  it('typing 3 moves only the KT setup cost of that product in the consolidated series (setup/net/ktSetup), the others do not move', () => {
    const before = consolidate(pf());
    openFor(2);
    type(FIELD, '3');
    expect(prod(2).knowledge.ktLeadMonths).toBe(3);
    expect(screen.getByRole('group', { name: 'Préparation du transfert : surchargé' })).toBeTruthy();
    const after = consolidate(pf());
    for (const m of ['savings', 'run', 'token', 'infra', 'humanFte', 'agentVfte', 'ktAvoided', 'khCost'] as const) expect(after.series[m]).toEqual(before.series[m]);
    expect(after.series.ktSetup).not.toEqual(before.series.ktSetup);
    expect(after.series.setup).not.toEqual(before.series.setup);
    const total = (s: number[]) => s.reduce((a, b) => a + b, 0);
    expect(total(after.series.ktSetup)).toBeCloseTo(total(before.series.ktSetup), 6);
    for (const id of [ids[0], ids[1]]) expect(after.products.find((v) => v.id === id)!.run).toBe(before.products.find((v) => v.id === id)!.run);
    expect(screen.queryByText(/lead capped/)).toBeNull();
  });

  it('a preparation longer than the wave start shows the clamp diagnostic', () => {
    openFor(2);
    type(FIELD, '9');
    expect(screen.getByText(/starts at calendar month 1 \(lead capped at 6\)/)).toBeTruthy();
  });
});
