// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeOrgUnit, setProductOwner } from '@/controllers/org';
import { consolidate, scopeHeadline, UNASSIGNED_UNIT } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { pfSimStore } from '@/store/portfolioSimulation';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { uiStore } from '@/ui/uiState';
import { kpi, LAZY, mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { unitTreeThree } from '../helpers/unitScope';
import { banner } from '../helpers/vueAgg';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));
afterEach(cleanup);

/** F-B81 (phase B10b): the Unit display scope in the app — the "Show" list, the headline bar, the banner, the empty state and the verdict. */
const select = () => screen.getByRole('combobox', { name: 'Show' }) as HTMLSelectElement;
const choose = (v: string) => act(() => { fireEvent.change(select(), { target: { value: v } }); });
const unitHead = (id: string) => scopeHeadline(consolidate(pf()), { kind: 'unit', id })!;

describe('Show: the unit tree as display scopes', () => {
  it('lists every unit in tree order, indented, with its level in the accessible name, then Unassigned', () => {
    unitTreeThree(); mountApp();
    const group = select().querySelector('optgroup[label="Units"]')!, opts = [...group.querySelectorAll('option')];
    expect(opts.map((o) => o.value)).toEqual(['unit:unit-delivery', 'unit:bu', 'unit:d1', 'unit:d2', 'unit:d3', 'unit:empty', `unit:${UNASSIGNED_UNIT}`]);
    expect(opts.map((o) => o.textContent)).toEqual(['Delivery', 'Retail BU', '· Payments', '· · Cards', '· Lending', 'Research', 'Unassigned']);
    expect(opts[3]!.getAttribute('aria-label')).toBe('Cards, unit level 3');
  });

  it('a unit shows its consolidated figures in the headline bar and the banner; the edit target goes back to All products', () => {
    const t = unitTreeThree(); mountApp();
    choose('unit:d1');
    expect(appStore().getState().portfolio.displayScope).toEqual({ kind: 'unit', id: 'd1' });
    expect(appStore().getState().portfolio.editScope).toBe('all');
    expect(uiStore.getState().toast).toContain('Showing unit Payments, level 2');
    const h = unitHead('d1');
    expect(screen.getByRole('complementary', { name: 'Headline results — Payments' })).toBeTruthy();
    expect(kpi(/^Payback$/)).toBe(fmtMonths(h.headline.paybackMonth));
    expect(kpi(/^Savings Y/)).toBe(fmtEurK(h.headline.endYear.savings));
    const change = screen.getByRole('combobox', { name: 'Change' });
    expect(change.querySelector('optgroup[label="Unit: Payments"]')!.textContent).toBe(pf().products.find((p) => p.id === t.ids[0])!.name);
  });

  it('a removed unit falls back to the product scope; the view state is never an undo step', () => {
    const t = unitTreeThree(); mountApp();
    choose('unit:empty');
    expect(t.s.getState().history.undo).toHaveLength(0);
    act(() => { removeOrgUnit('empty'); });
    expect(select().value).toBe(`product:${t.ids[0]}`);
  });
});

describe('Unit scope in the sections', () => {
  it('a result section is calculated on the unit; without a run the unit\'s verdict invites to run it (no "not available" state any more)', async () => {
    unitTreeThree(); pfSimStore.setState({ run: null, progress: null, params: null }); mountApp('decision');
    await sectionReady(/Decision Intelligence/);
    choose('unit:bu');
    expect(await screen.findByText(/Run the portfolio simulation first/, undefined, LAZY)).toBeTruthy();
    expect(screen.queryByText(/not available at the unit scope/)).toBeNull();
    expect(banner()).toContain('Calculated on: Unit: Retail BU (2 planned products)');
  });

  it('an empty unit shows the empty state; owning a product fills it', async () => {
    const t = unitTreeThree(); mountApp('financial');
    await sectionReady(/Financial/);
    choose('unit:empty');
    expect((await screen.findByText(/Unit Research has no planned product/, undefined, LAZY)).closest('[data-empty-scope]')).toBeTruthy();
    act(() => { setProductOwner(t.ids[2], 'empty'); });
    expect(screen.queryByText(/Unit Research has no planned product/)).toBeNull();
    await sectionReady(/Financial/);
    expect(banner()).toContain('Unit: Research (1 planned product)');
  });
});
