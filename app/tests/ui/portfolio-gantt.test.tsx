// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { assignWave, setWaveStart } from '@/controllers/wave';
import { consolidate, portfolioGantt } from '@/domain/portfolio';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';
import { freshStore } from '../store/helpers';

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const open = async () => { mountApp('gantt'); await sectionReady(/Gantt/); };
const wavePanel = () => screen.queryByRole('region', { name: 'Gantt des vagues' });

describe('Gantt: wave rows (F18)', () => {
  it('Produit scope (default): no wave panel; the offset of the active product on the portfolio calendar is stated', async () => {
    await open();
    expect(wavePanel()).toBeNull();
    expect(document.querySelector('[data-gantt-offset]')!.textContent).toContain('Calendrier du portefeuille : Produit 1 démarre');
    act(() => { fireEvent.change(screen.getByRole('combobox', { name: 'Produit' }), { target: { value: ids[2] } }); });
    expect(document.querySelector('[data-gantt-offset]')!.textContent).toContain(`C démarre ${portfolioGantt(pf(), consolidate(pf())).waves[1]!.products[0]!.meta.replace(/^démarre /, '').split(' (')[0]}`);
  });

  it('Portefeuille scope: one bar row per wave, focusable groups with labels; expandable to products with their milestones', async () => {
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await open();
    const panel = wavePanel()!, g = portfolioGantt(pf(), consolidate(pf()));
    const rows = [...panel.querySelectorAll('[data-gantt-wave]')];
    expect(rows.map((r) => r.getAttribute('data-gantt-wave'))).toEqual(waves);
    const bar = within(rows[0] as HTMLElement).getByRole('group', { name: /^Vague 1, 2 produits, de / });
    expect(bar.tabIndex).toBe(0);
    expect(parseFloat(bar.style.left)).toBeCloseTo(g.waves[0]!.left, 2);
    expect(parseFloat(bar.style.width)).toBeCloseTo(g.waves[0]!.width, 2);
    expect(panel.querySelectorAll('.ac-gantt-prod')).toHaveLength(0);
    fireEvent.click(within(panel).getByRole('button', { name: 'Expand Vague 1' }));
    const prods = [...panel.querySelectorAll('.ac-gantt-prod')];
    expect(prods).toHaveLength(2);
    const label = prods[1]!.getAttribute('aria-label')!;
    expect(label).toContain('B, démarre');
    expect(label).toContain('Jalons :');
    expect(label).toContain('L4 maturity reached');
    expect(label).toContain('First agent vFTE');
    const marks = prods[1]!.parentElement!.querySelectorAll('[data-milestone]');
    expect(marks.length).toBe(g.waves[0]!.products[1]!.milestones.length);
    expect(prods.every((p) => (p as HTMLElement).tabIndex === 0)).toBe(true);
    fireEvent.click(within(panel).getByRole('button', { name: 'Collapse Vague 1' }));
    expect(panel.querySelectorAll('.ac-gantt-prod')).toHaveLength(0);
  });

  it('milestones sit at the wave start + offset + the product\'s own month; moving the wave moves them', async () => {
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await open();
    const month = (g: ReturnType<typeof portfolioGantt>) => g.waves[1]!.products[0]!.milestones.find((m) => m.label === 'First agent vFTE')!.month;
    const before = month(portfolioGantt(pf(), consolidate(pf())));
    act(() => { setWaveStart(waves[1], 9); });
    expect(month(portfolioGantt(pf(), consolidate(pf())))).toBe(before + 3);
    fireEvent.click(within(wavePanel()!).getByRole('button', { name: 'Expand Wave 2' }));
    expect(wavePanel()!.querySelector('.ac-gantt-prod')!.getAttribute('aria-label')).toContain('First agent vFTE');
  });

  it('Vague scope: only that wave, expanded', async () => {
    act(() => { setDisplayScope({ kind: 'wave', id: waves[1] }); });
    await open();
    const panel = wavePanel()!;
    expect([...panel.querySelectorAll('[data-gantt-wave]')].map((r) => r.getAttribute('data-gantt-wave'))).toEqual([waves[1]]);
    expect(panel.querySelectorAll('.ac-gantt-prod')).toHaveLength(1);
    expect(panel.textContent).toContain('Wave 2');
  });

  it('an unplanned product is listed outside the chart', async () => {
    act(() => { setDisplayScope({ kind: 'portfolio' }); assignWave(ids[1], null); });
    await open();
    expect(wavePanel()!.textContent).toContain('Non planifiés (absents du Gantt) : B.');
    expect(within(wavePanel() as HTMLElement).getByRole('group', { name: /^Vague 1, 1 produit, de / })).toBeTruthy();
  });

  it('axe finds no violation on the wave Gantt', async () => {
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await open();
    fireEvent.click(within(wavePanel()!).getByRole('button', { name: 'Expand Vague 1' }));
    const r = await axe.run(wavePanel() as HTMLElement, { rules: { 'color-contrast': { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(' | ')}`)).toEqual([]);
  });
});

describe('Gantt: one product is unchanged', () => {
  it('no wave panel, no offset line, whatever the stored scope', async () => {
    freshStore();
    await open();
    expect(wavePanel()).toBeNull();
    expect(document.querySelector('[data-gantt-offset]')).toBeNull();
  });
});
