// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { axeViolations } from '../helpers/axe';
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
const wavePanel = () => screen.queryByRole('region', { name: 'Wave Gantt' });

describe('Gantt: wave rows (F18)', () => {
  it('Product scope (default): no wave panel; the offset of the active product on the portfolio calendar is stated', async () => {
    await open();
    expect(wavePanel()).toBeNull();
    expect(document.querySelector('[data-gantt-offset]')!.textContent).toContain('Portfolio calendar: Product 1 starts');
    act(() => { fireEvent.change(screen.getByRole('combobox', { name: 'Show' }), { target: { value: `product:${ids[2]}` } }); });
    expect(document.querySelector('[data-gantt-offset]')!.textContent).toContain(
      `C starts ${portfolioGantt(pf(), consolidate(pf())).waves[1]!.products[0]!.meta.replace(/^starts /, '').split(' (')[0]}`);
  });

  it('Portfolio scope: one bar row per wave, focusable groups with labels; expandable to products with their milestones', async () => {
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await open();
    const panel = wavePanel()!, g = portfolioGantt(pf(), consolidate(pf()));
    const rows = [...panel.querySelectorAll('[data-gantt-wave]')];
    expect(rows.map((r) => r.getAttribute('data-gantt-wave'))).toEqual(waves);
    const bar = within(rows[0] as HTMLElement).getByRole('group', { name: /^Wave 1, 2 products, from / });
    expect(bar.tabIndex).toBe(0);
    expect(parseFloat(bar.style.left)).toBeCloseTo(g.waves[0]!.left, 2);
    expect(parseFloat(bar.style.width)).toBeCloseTo(g.waves[0]!.width, 2);
    expect(panel.querySelectorAll('.ac-gantt-prod')).toHaveLength(0);
    fireEvent.click(within(panel).getByRole('button', { name: 'Expand Wave 1' }));
    const prods = [...panel.querySelectorAll('.ac-gantt-prod')];
    expect(prods).toHaveLength(2);
    const label = prods[1]!.getAttribute('aria-label')!;
    expect(label).toContain('B, starts');
    expect(label).toContain('Milestones:');
    expect(label).toContain('L4 maturity reached');
    expect(label).toContain('First agent vFTE');
    const marks = prods[1]!.parentElement!.querySelectorAll('[data-milestone]');
    expect(marks.length).toBe(g.waves[0]!.products[1]!.milestones.length);
    expect(prods.every((p) => (p as HTMLElement).tabIndex === 0)).toBe(true);
    fireEvent.click(within(panel).getByRole('button', { name: 'Collapse Wave 1' }));
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

  it('Wave scope: only that wave, expanded', async () => {
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
    expect(wavePanel()!.textContent).toContain('Unscheduled (absent from the Gantt): B.');
    expect(within(wavePanel() as HTMLElement).getByRole('group', { name: /^Wave 1, 1 product, from / })).toBeTruthy();
  });

  it('axe finds no violation on the wave Gantt', async () => {
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await open();
    fireEvent.click(within(wavePanel()!).getByRole('button', { name: 'Expand Wave 1' }));
    expect(await axeViolations(wavePanel())).toEqual([]);
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
