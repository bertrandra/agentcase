// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setPortfolioHorizon } from '@/controllers/portfolio';
import { assignWave } from '@/controllers/wave';
import { consolidate } from '@/domain/portfolio';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const undo = () => fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
const col = (name: string) => screen.getByRole('region', { name });
const inWave = (id: string) => pf().products.find((p) => p.id === id)!.waveId;
const open = async () => { mountApp('waves'); await sectionReady(/Waves/); };

describe('Waves section: waves', () => {
  it('create, rename, reorder and delete a wave; each is undoable', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Name of the new wave'), { target: { value: 'Wave Z' } });
    fireEvent.change(screen.getByLabelText('Start of the new wave (month)'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add a wave' }));
    expect(pf().waves.map((w) => [w.name, w.startMonth])).toEqual([['Wave 1', 0], ['Wave 2', 6], ['Wave Z', 12]]);
    const name = screen.getByLabelText('Name of wave Wave Z');
    fireEvent.change(name, { target: { value: 'Last' } });
    fireEvent.blur(name);
    expect(pf().waves[2]!.name).toBe('Last');
    fireEvent.click(screen.getByRole('button', { name: 'Move wave Last earlier' }));
    expect(pf().waves.map((w) => w.name)).toEqual(['Wave 1', 'Last', 'Wave 2']);
    expect((screen.getByRole('button', { name: 'Move wave Wave 1 earlier' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete wave Wave 2' }));
    expect(pf().waves.map((w) => w.name)).toEqual(['Wave 1', 'Last']);
    expect(inWave(ids[2])).toBeNull();
    expect(within(col('Unscheduled')).getAllByRole('listitem')).toHaveLength(1);
    act(() => undo());
    expect(inWave(ids[2])).toBe(waves[1]);
    expect(pf().waves).toHaveLength(3);
  });

  it('changing the start month of the waves shifts the consolidated payback by k months (UI to store)', async () => {
    act(() => { setPortfolioHorizon(60); });
    await open();
    const before = consolidate(pf()).summary.paybackMonth as number, k = 4;
    expect(before).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Start of Wave 1 (month)'), { target: { value: String(k) } });
    fireEvent.change(screen.getByLabelText('Start of Wave 2 (month)'), { target: { value: String(6 + k) } });
    expect(pf().waves.map((w) => w.startMonth)).toEqual([k, 6 + k]);
    expect(consolidate(pf()).summary.paybackMonth).toBe(before + k);
    expect(screen.getByLabelText('Start of Wave 2 (month)').closest('.ac-wave-ctrl')!.textContent).toContain('→');
  });

  it('the Knowledge transfer wave effect is linked, not duplicated', async () => {
    await open();
    expect(screen.queryByText(/Hub effect by wave/)).toBeNull();
    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: /Knowledge transfer/ }));
    await sectionReady(/Knowledge transfer/);
    expect(screen.getByText('Hub effect by wave')).toBeTruthy();
  });
});

describe('Products table: the Wave column is editable with the same command', () => {
  it('a select per row assigns the wave (or none) and Ctrl+Z undoes it', async () => {
    mountApp('products');
    await sectionReady(/Products/);
    const sel = screen.getByLabelText('Wave of product no. 2') as HTMLSelectElement;
    expect(sel.value).toBe(waves[0]);
    fireEvent.change(sel, { target: { value: waves[1] } });
    expect(inWave(ids[1])).toBe(waves[1]);
    fireEvent.change(screen.getByLabelText('Wave of product no. 2'), { target: { value: '' } });
    expect(inWave(ids[1])).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('excluded from the consolidation');
    act(() => undo());
    expect(inWave(ids[1])).toBe(waves[1]);
    act(() => { assignWave(ids[1], waves[0]); });
    expect((screen.getByLabelText('Wave of product no. 2') as HTMLSelectElement).value).toBe(waves[0]);
  });
});

describe('accessibility', () => {
  it('axe finds no violation on the board (names, roles, no nested interactive)', async () => {
    await open();
    const r = await axe.run(document.querySelector('main') as HTMLElement, { rules: { 'color-contrast': { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(' | ')}`)).toEqual([]);
  });
});
