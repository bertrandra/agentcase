// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setPortfolioHorizon } from '@/controllers/portfolio';
import { assignWave } from '@/controllers/wave';
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

describe('Vagues section: waves', () => {
  it('create, rename, reorder and delete a wave; each is undoable', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Nom de la nouvelle vague'), { target: { value: 'Vague Z' } });
    fireEvent.change(screen.getByLabelText('Démarrage de la nouvelle vague (mois)'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une vague' }));
    expect(pf().waves.map((w) => [w.name, w.startMonth])).toEqual([['Vague 1', 0], ['Wave 2', 6], ['Vague Z', 12]]);
    const name = screen.getByLabelText('Nom de la vague Vague Z');
    fireEvent.change(name, { target: { value: 'Dernière' } });
    fireEvent.blur(name);
    expect(pf().waves[2]!.name).toBe('Dernière');
    fireEvent.click(screen.getByRole('button', { name: 'Avancer la vague Dernière' }));
    expect(pf().waves.map((w) => w.name)).toEqual(['Vague 1', 'Dernière', 'Wave 2']);
    expect((screen.getByRole('button', { name: 'Avancer la vague Vague 1' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la vague Wave 2' }));
    expect(pf().waves.map((w) => w.name)).toEqual(['Vague 1', 'Dernière']);
    expect(inWave(ids[2])).toBeNull();
    expect(within(col('Non planifié')).getAllByRole('listitem')).toHaveLength(1);
    act(() => undo());
    expect(inWave(ids[2])).toBe(waves[1]);
    expect(pf().waves).toHaveLength(3);
  });

  it('changing the start month of the waves shifts the consolidated payback by k months (UI to store)', async () => {
    act(() => { setPortfolioHorizon(60); });
    await open();
    const before = consolidate(pf()).summary.paybackMonth as number, k = 4;
    expect(before).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Démarrage de Vague 1 (mois)'), { target: { value: String(k) } });
    fireEvent.change(screen.getByLabelText('Démarrage de Wave 2 (mois)'), { target: { value: String(6 + k) } });
    expect(pf().waves.map((w) => w.startMonth)).toEqual([k, 6 + k]);
    expect(consolidate(pf()).summary.paybackMonth).toBe(before + k);
    expect(screen.getByLabelText('Démarrage de Wave 2 (mois)').closest('.ac-wave-ctrl')!.textContent).toContain('→');
  });

  it('the Knowledge transfer wave effect is linked, not duplicated', async () => {
    await open();
    expect(screen.queryByText(/Effet du hub par vague/)).toBeNull();
    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: /Knowledge transfer/ }));
    await sectionReady(/Knowledge transfer/);
    expect(screen.getByText('Effet du hub par vague')).toBeTruthy();
  });
});

describe('Produits table: the Vague column is editable with the same command', () => {
  it('a select per row assigns the wave (or none) and Ctrl+Z undoes it', async () => {
    mountApp('products');
    await sectionReady(/Produits/);
    const sel = screen.getByLabelText('Vague du produit n°2') as HTMLSelectElement;
    expect(sel.value).toBe(waves[0]);
    fireEvent.change(sel, { target: { value: waves[1] } });
    expect(inWave(ids[1])).toBe(waves[1]);
    fireEvent.change(screen.getByLabelText('Vague du produit n°2'), { target: { value: '' } });
    expect(inWave(ids[1])).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('exclu de la consolidation');
    act(() => undo());
    expect(inWave(ids[1])).toBe(waves[1]);
    act(() => { assignWave(ids[1], waves[0]); });
    expect((screen.getByLabelText('Vague du produit n°2') as HTMLSelectElement).value).toBe(waves[0]);
  });
});

describe('accessibility', () => {
  it('axe finds no violation on the board (names, roles, no nested interactive)', async () => {
    await open();
    const r = await axe.run(document.querySelector('main') as HTMLElement, { rules: { 'color-contrast': { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(' | ')}`)).toEqual([]);
  });
});
