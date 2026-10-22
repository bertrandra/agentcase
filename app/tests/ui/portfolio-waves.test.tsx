// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calendarOf, consolidate } from '@/domain/portfolio';
import { fmtEurK } from '@/ui/format';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const undo = () => fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
const col = (name: string) => screen.getByRole('region', { name });
const card = (id: string) => document.querySelector(`li[data-product="${id}"]`) as HTMLElement;
const inWave = (id: string) => pf().products.find((p) => p.id === id)!.waveId;
const open = async () => { mountApp('waves'); await sectionReady(/Vagues/); };

describe('Vagues section: the board', () => {
  it('one labelled region per wave in order, then "Non planifié"; cards are the products; totals are the consolidation\'s', async () => {
    await open();
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label')).filter((n) => /^(Vague|Non)/.test(n ?? ''))).toEqual(['Vague : Vague 1', 'Vague : Wave 2', 'Non planifié']);
    expect([...col('Vague : Vague 1').querySelectorAll('li[data-product]')].map((l) => l.getAttribute('data-product'))).toEqual([ids[0], ids[1]]);
    expect(card(ids[2]).closest('section')!.getAttribute('aria-label')).toBe('Vague : Wave 2');
    const c = consolidate(pf());
    expect(within(col('Vague : Vague 1')).getByText(/2 produits/).textContent).toContain(`Net ${fmtEurK(c.waves[0]!.summary.net)}`);
    expect(within(col('Vague : Wave 2')).getByText(/1 produit/).textContent).toContain(`VAN ${fmtEurK(c.waves[1]!.summary.npv)}`);
    expect(within(col('Non planifié')).getByText(/Exclus de la consolidation/)).toBeTruthy();
    expect(col('Vague : Wave 2').querySelector('.ac-wave-ctrl .ac-muted')!.textContent).toBe(`→ ${calendarOf(pf()).dateAt(6)}`);
  });

  it('drag and drop moves a product between waves and to Non planifié; each is one undo step with an announcement', async () => {
    await open();
    const drag = (id: string, region: string) => {
      fireEvent.dragStart(card(id), { dataTransfer: { setData: () => undefined } });
      fireEvent.dragOver(col(region));
      fireEvent.drop(col(region));
    };
    drag(ids[1], 'Vague : Wave 2');
    expect(inWave(ids[1])).toBe(waves[1]);
    expect(screen.getByRole('status').textContent).toContain('B déplacé vers Wave 2');
    expect(within(col('Vague : Wave 2')).getByText(/2 produits/)).toBeTruthy();
    drag(ids[2], 'Non planifié');
    expect(inWave(ids[2])).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('exclu de la consolidation');
    act(() => undo());
    expect(inWave(ids[2])).toBe(waves[1]);
    act(() => undo());
    expect(inWave(ids[1])).toBe(waves[0]);
  });

  it('keyboard: ArrowRight / ArrowLeft move the focused card to the next / previous column; the end of the board stops', async () => {
    await open();
    const b = card(ids[1]);
    b.focus();
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    expect(inWave(ids[1])).toBe(waves[1]);
    expect(screen.getByRole('status').textContent).toContain('Wave 2');
    fireEvent.keyDown(card(ids[1]), { key: 'ArrowRight' });
    expect(inWave(ids[1])).toBeNull();
    fireEvent.keyDown(card(ids[1]), { key: 'ArrowRight' });
    expect(inWave(ids[1])).toBeNull();
    fireEvent.keyDown(card(ids[1]), { key: 'ArrowLeft' });
    expect(inWave(ids[1])).toBe(waves[1]);
    act(() => undo());
    expect(inWave(ids[1])).toBeNull();
  });

  it('the "Déplacer vers la vague…" menu moves a card (without the current wave in its options) and Ctrl+Z restores it', async () => {
    await open();
    const menu = screen.getByLabelText('Déplacer C vers la vague…') as HTMLSelectElement;
    expect([...menu.options].map((o) => o.textContent)).toEqual(['Déplacer vers la vague…', 'Vague 1', 'Non planifié']);
    fireEvent.change(menu, { target: { value: waves[0] } });
    expect(inWave(ids[2])).toBe(waves[0]);
    expect(within(col('Vague : Vague 1')).getByText(/3 produits/)).toBeTruthy();
    act(() => undo());
    expect(inWave(ids[2])).toBe(waves[1]);
  });

  it('the product offset is edited on the card (same command as the Produits table) and moves the product start', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Décalage en mois de B'), { target: { value: '3' } });
    expect(pf().products[1]!.offsetMonths).toBe(3);
    expect(card(ids[1]).textContent).toContain('démarre');
    act(() => undo());
    expect(pf().products[1]!.offsetMonths).toBe(0);
  });
});
