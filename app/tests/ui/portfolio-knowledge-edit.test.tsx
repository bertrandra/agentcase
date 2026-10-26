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

describe('Knowledge domains', () => {
  it('free label + weight rows; the weights must add up to 100 (the remaining % is shown), an invalid list is refused and announced', () => {
    openFor(1);
    const add = () => fireEvent.click(screen.getByRole('button', { name: 'Add a domain' }));
    add();
    type('Domain label 1', 'Documentation'); type('Domain weight 1 (%)', '40');
    expect(screen.getByText('60% left to allocate.')).toBeTruthy();
    add();
    expect((screen.getByLabelText('Domain weight 2 (%)') as HTMLInputElement).value).toBe('60');
    type('Domain label 2', 'Code'); type('Domain weight 2 (%)', '50');
    expect(screen.getByText('10% left to allocate.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save the domains' }));
    expect(screen.getByRole('alert').textContent).toMatch(/add up to 100% \(10% left\)/);
    expect(prod(1).knowledge.domains).toBeUndefined();
    type('Domain weight 2 (%)', '70');
    expect(screen.getByText('10% too much.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save the domains' }));
    expect(screen.getByRole('alert').textContent).toMatch(/10% too much/);
    type('Domain weight 2 (%)', '60');
    expect(screen.getByText('Total: 100% — ready to save.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save the domains' }));
    expect(prod(1).knowledge.domains).toEqual([{ label: 'Documentation', weightPct: 40 }, { label: 'Code', weightPct: 60 }]);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('group', { name: 'Knowledge domains: overridden' })).toBeTruthy();
    expect(prod(0).knowledge.domains).toBeUndefined();
  });

  it('"ready to save" exactly when the save accepts the total (one split rule, domain/split.ts): 33.333 × 3 is saved, 99.4 is not ready', () => {
    openFor(1);
    for (let i = 1; i <= 3; i++) { fireEvent.click(
      screen.getByRole('button', { name: 'Add a domain' })); type(`Domain label ${i}`, `D${i}`); type(`Domain weight ${i} (%)`, '33.333'); }
    expect(screen.getByText('Total: 100% — ready to save.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save the domains' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(prod(1).knowledge.domains?.map((d) => d.weightPct)).toEqual([33.333, 33.333, 33.333]);
    type('Domain weight 3 (%)', '32.733');
    expect(screen.queryByText('Total: 100% — ready to save.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save the domains' }));
    expect(screen.getByRole('alert').textContent).toMatch(/change refused/);
    expect(prod(1).knowledge.domains?.map((d) => d.weightPct)).toEqual([33.333, 33.333, 33.333]);
  });

  it('an empty label is refused; a row can be removed; "Remove all" and Ctrl+Z', () => {
    openFor(1);
    fireEvent.click(screen.getByRole('button', { name: 'Add a domain' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save the domains' }));
    expect(screen.getByRole('alert').textContent).toMatch(/label/);
    type('Domain label 1', 'Tickets');
    fireEvent.click(screen.getByRole('button', { name: 'Save the domains' }));
    expect(prod(1).knowledge.domains).toEqual([{ label: 'Tickets', weightPct: 100 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove all domains' }));
    expect(prod(1).knowledge.domains).toBeUndefined();
    act(() => { appStore().undo(); });
    expect(prod(1).knowledge.domains).toHaveLength(1);
    expect((screen.getByLabelText('Domain label 1') as HTMLInputElement).value).toBe('Tickets');
    fireEvent.click(screen.getByRole('button', { name: 'Remove domain Tickets' }));
    expect(screen.queryByLabelText('Domain label 1')).toBeNull();
  });
});

describe('Knowledge transfer preparation (months before the wave)', () => {
  const FIELD = 'Knowledge transfer preparation (months before the wave)';

  it('refuses a negative or fractional number, announces it, and keeps the document unchanged', () => {
    openFor(2);
    type(FIELD, '-1');
    fireEvent.blur(screen.getByLabelText(FIELD));
    expect(screen.getByRole('alert').textContent).toMatch(/whole number of months, 0 or more/);
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
    expect(screen.getByRole('group', { name: 'Knowledge transfer preparation: overridden' })).toBeTruthy();
    const after = consolidate(pf());
    for (const m of ['savings', 'run', 'token', 'infra', 'humanFte', 'agentVfte', 'ktAvoided',
      'khCost'] as const) expect(after.series[m]).toEqual(before.series[m]);
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
