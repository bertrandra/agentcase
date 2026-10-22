// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setActiveProduct } from '@/controllers/product';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string];
beforeEach(() => { ids = threeProducts().ids; });
afterEach(cleanup);
const teams = () => pf().products.map((p) => JSON.stringify(p.teamIn));
const total = () => screen.getByLabelText('Total AS-IS team (FTE)') as HTMLInputElement;

describe('team editing targets the active product only (spec F2)', () => {
  it('editing the team of product B never changes product A or C; the section says whose team it is', async () => {
    mountApp('team-in');
    await sectionReady(/Input team/);
    const before = teams();
    expect(screen.getByText(/Équipe de :/).textContent).toContain('Produit 1');
    act(() => { setActiveProduct(ids[1]); });
    expect(screen.getByText(/Équipe de :/).textContent).toContain('B');
    fireEvent.change(total(), { target: { value: '33' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add a resource' }));
    const after = teams();
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(after[1]).not.toBe(before[1]);
    expect(pf().products[1]!.teamIn.length).toBe(JSON.parse(before[1]!).length + 1);
  });
  it('the same edit in "Ce produit seulement" mode leaves the other teams alone too, and the figure shown is the active one', async () => {
    mountApp('team-in');
    await sectionReady(/Input team/);
    fireEvent.click(screen.getByLabelText('Ce produit seulement'));
    const a = total().value, before = teams();
    act(() => { setActiveProduct(ids[2]); });
    fireEvent.change(total(), { target: { value: '21' } });
    expect(teams()[0]).toBe(before[0]);
    expect(teams()[1]).toBe(before[1]);
    act(() => { setActiveProduct(ids[0]); });
    expect(total().value).toBe(a);
  });
});
