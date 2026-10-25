// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setActiveProduct } from '@/controllers/product';
import { addSharedLine } from '@/controllers/sharedTeam';
import { axeViolations } from '../helpers/axe';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const teams = () => pf().products.map((p) => JSON.stringify(p.teamIn));
const total = () => screen.getByLabelText('Total AS-IS team (FTE)') as HTMLInputElement;
const undoKey = () => fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
const region = () => screen.getByRole('region', { name: 'Shared team lines' });

describe('team editing targets the active product only (spec F2)', () => {
  it('editing the team of product B never changes product A or C; the section says whose team it is', async () => {
    mountApp('team-in');
    await sectionReady(/Input team/);
    const before = teams();
    expect(screen.getByText(/Team of:/).textContent).toContain('Product 1');
    act(() => { setActiveProduct(ids[1]); });
    expect(screen.getByText(/Team of:/).textContent).toContain('B');
    fireEvent.change(total(), { target: { value: '33' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add a resource' }));
    const after = teams();
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(after[1]).not.toBe(before[1]);
    expect(pf().products[1]!.teamIn.length).toBe(JSON.parse(before[1]!).length + 1);
  });
  it('the same edit in "This product only" mode leaves the other teams alone too, and the figure shown is the active one', async () => {
    mountApp('team-in');
    await sectionReady(/Input team/);
    fireEvent.change(screen.getByRole('combobox', { name: 'Change' }), { target: { value: ids[0] } });   // Change: Product 1
    const a = total().value, before = teams();
    act(() => { setActiveProduct(ids[2]); });
    fireEvent.change(total(), { target: { value: '21' } });
    expect(teams()[0]).toBe(before[0]);
    expect(teams()[1]).toBe(before[1]);
    act(() => { setActiveProduct(ids[0]); });
    expect(total().value).toBe(a);
  });
});

describe('Products: shared team lines', () => {
  it('add a line, give shares per product from labelled inputs, see the allocated total and an over-100 % warning; undo', async () => {
    mountApp('products');
    await sectionReady(/Products/);
    expect(region().textContent).toContain('No shared line');
    fireEvent.click(screen.getByRole('button', { name: '+ Add a shared line' }));
    expect(pf().sharedTeam).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('FTE of shared line 1'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Skill of shared line 1'), { target: { value: 'Test/QA' } });
    fireEvent.change(screen.getByLabelText('Share of Product 1 in shared line 1 (%)'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Share of B in shared line 1 (%)'), { target: { value: '40' } });
    const line = pf().sharedTeam![0]!;
    expect(line).toMatchObject({ etp: 2, skill: 'Test/QA', allocations: { [ids[0]]: 60, [ids[1]]: 40 } });
    expect(region().textContent).toContain('100 %');
    fireEvent.change(screen.getByLabelText('Share of C in shared line 1 (%)'), { target: { value: '10' } });
    expect(region().querySelector('[data-shared-status]')!.textContent).toMatch(/over 100 %/);
    undoKey();
    expect(pf().sharedTeam![0]!.allocations[ids[2]]).toBeUndefined();
    expect(await axeViolations(region(), { region: false })).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove shared line 1' }));
    expect(pf()).not.toHaveProperty('sharedTeam');
  });

  it('the Input team section shows the active product\'s share as a read-only "Shared" row', async () => {
    act(() => { addSharedLine({ etp: 2, allocations: { [ids[0]]: 25 } }); });
    mountApp('team-in');
    await sectionReady(/Input team/);
    const row = document.querySelector<HTMLElement>('tr[data-shared-row]')!;
    expect(row.textContent).toContain('Shared');
    expect(row.textContent).toContain('0.50');
    expect(row.querySelector('input, select, button')).toBeNull();
  });
});
