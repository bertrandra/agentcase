// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { axeViolations } from '../helpers/axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveProduct, removeProduct } from '@/controllers/product';
import { setTeamTotal } from '@/controllers/baseline';
import { showProduct } from '@/controllers/displayScope';
import { exportSnapshotJson } from '@/controllers/files';
import { assignWave } from '@/controllers/wave';
import { goSection, openGroup } from '@/ui/uiState';
import { kpi, mountApp, pf, sectionReady, sidebar } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const show = () => screen.getByRole('combobox', { name: 'Show' }) as HTMLSelectElement;
const change = () => screen.getByRole('combobox', { name: 'Change' }) as HTMLSelectElement;
const pick = (sel: HTMLSelectElement, value: string) => fireEvent.change(sel, { target: { value } });

describe('top bar with several products', () => {
  it('shows the single Show selector (Portfolio, waves, products with wave labels) and the Change dropdown, default "All products"', () => {
    mountApp();
    const sel = screen.getByRole('combobox', { name: 'Show' }) as HTMLSelectElement;
    expect([...sel.options].map((o) => o.textContent)).toEqual(['Portfolio', 'Wave 1', 'Wave 2', 'Product 1 (Wave 1)', 'B (Wave 1)', 'C (Wave 2)']);
    expect(sel.value).toBe(`product:${ids[0]}`);
    expect(screen.queryByRole('combobox', { name: 'Display scope' })).toBeNull();
    const edit = screen.getByRole('combobox', { name: 'Change' }) as HTMLSelectElement;
    expect([...edit.options].map((o) => o.textContent)).toEqual(['All products', 'Product 1', 'B', 'C']);
    expect(edit.value).toBe('all');
    expect(screen.queryByRole('radiogroup', { name: 'Change' })).toBeNull();
  });
  it('switching the product changes the KPI figures and the team shown; the choice is saved with the file but is no undo step', async () => {
    mountApp('team-in');
    fireEvent.change(screen.getByRole('combobox', { name: 'Show' }), { target: { value: `product:${ids[1]}` } });
    act(() => setTeamTotal(40));
    const total = () => (screen.getByLabelText('Total AS-IS team (FTE)') as HTMLInputElement).value;
    await sectionReady(/Input team/);
    const kpiB = kpi(/^Savings Y/), teamB = total();
    fireEvent.change(screen.getByRole('combobox', { name: 'Show' }), { target: { value: `product:${ids[0]}` } });
    expect(total()).not.toBe(teamB);
    expect(kpi(/^Savings Y/)).not.toBe(kpiB);
    expect(screen.getByRole('status').textContent).toContain('Showing Product 1');
    expect(JSON.parse(exportSnapshotJson().json).activeProductId).toBe(ids[0]);
    expect(pf().activeProductId).toBe(ids[0]);
    expect(screen.getByText(/Team of:/).textContent).toContain('Product 1');
  });
  it('the Change dropdown sets the transient edit scope (and the edited product)', () => {
    mountApp();
    fireEvent.change(screen.getByRole('combobox', { name: 'Change' }), { target: { value: ids[0] } });
    expect(pf().editScope).toBe('product');
    expect(JSON.parse(exportSnapshotJson().json).editScope).toBeUndefined();
    fireEvent.change(screen.getByRole('combobox', { name: 'Change' }), { target: { value: 'all' } });
    expect(pf().editScope).toBe('all');
  });
  it('labels "👁 Show" and "✏️ Change" (icons aria-hidden, one-line tooltips), no "Editing:" chip; axe: the top bar has no violation', async () => {
    mountApp();
    const label = (name: string) => screen.getByRole('combobox', { name }).closest('label')!;
    const text = (el: Element) => [...el.childNodes].filter((n) => n.nodeName !== 'SELECT').map((n) => n.textContent).join('');
    expect(text(label('Show'))).toBe('👁Show ');
    expect(text(label('Change'))).toBe('✏️Change ');
    expect([...screen.getByRole('banner').querySelectorAll('.ac-prodsel-icon')].map((i) => i.getAttribute('aria-hidden'))).toEqual(['true', 'true']);
    expect(label('Show').title).toBe('What you look at: the portfolio, a wave or one product');
    expect(label('Change').title).toBe('Where your changes go: all products (shared values) or one product');
    expect(document.querySelector('.ac-editing')).toBeNull();
    expect(screen.queryByText(/Editing:/)).toBeNull();
    expect(await axeViolations(screen.getByRole('banner'))).toEqual([]);
  });
  it('Show names an unscheduled product "(unscheduled)" and keeps " (archived)"', () => {
    act(() => { assignWave(ids[2], null); archiveProduct(ids[1]); });
    mountApp();
    expect([...show().options].map((o) => o.textContent).slice(3)).toEqual(['Product 1 (Wave 1)', 'B (Wave 1) (archived)', 'C (unscheduled)']);
  });
  it('Change follows Show: a product → Change = that product; Portfolio or a Wave → Change = All products; toasts "Showing …"', () => {
    mountApp();
    pick(show(), `product:${ids[1]}`);
    expect([change().value, pf().editScope, pf().activeProductId]).toEqual([ids[1], 'product', ids[1]]);
    expect(screen.getByRole('status').textContent).toContain('Showing B');
    pick(show(), 'portfolio');
    expect([change().value, pf().editScope, pf().activeProductId, pf().displayScope]).toEqual(['all', 'all', ids[1], { kind: 'portfolio' }]);
    expect(screen.getByRole('status').textContent).toContain('Showing Portfolio');
    pick(change(), ids[2]);   // an explicit Change in a Portfolio view: that product is edited in place, the Portfolio stays shown
    expect([change().value, pf().editScope, pf().activeProductId, pf().displayScope]).toEqual([ids[2], 'product', ids[2], { kind: 'portfolio' }]);
    expect(screen.getByRole('status').textContent).toContain('Changing C');
    pick(show(), `wave:${waves[0]}`);
    expect([change().value, pf().editScope, pf().displayScope]).toEqual(['all', 'all', { kind: 'wave', id: waves[0] }]);
    expect(screen.getByRole('status').textContent).toContain('Showing Wave 1');
    pick(change(), ids[0]); pick(change(), 'all');
    expect([change().value, pf().editScope, pf().activeProductId]).toEqual(['all', 'all', ids[0]]);
    expect(screen.getByRole('status').textContent).toContain('Changing all products');
    expect(screen.getByRole('button', { name: /^Undo/ }).hasAttribute('disabled')).toBe(true);   // view state: never an undo step
  });
  it('Change follows Show through "Edit this product" too (controller showProduct)', () => {
    mountApp(); pick(show(), 'portfolio');
    act(() => { showProduct(ids[2]); });
    expect([show().value, change().value, pf().editScope]).toEqual([`product:${ids[2]}`, ids[2], 'product']);
  });
  it('the Portfolio group is in the sidebar of every persona with 2+ products and leaves with the second-to-last product', () => {
    mountApp();
    act(() => openGroup('portfolio'));
    const group = sidebar().querySelector('[data-group="portfolio"]')!;
    expect([...group.querySelectorAll('[data-section]')].map((b) => (b as HTMLElement).dataset.section))
      .toEqual(['products', 'overrides', 'knowledge-transfer', 'waves', 'consolidation', 'portfolio-stress']);
    act(() => { removeProduct(ids[1]); });
    expect(sidebar().querySelector('[data-group="portfolio"]')).toBeTruthy();
    act(() => { removeProduct(ids[2]); });
    expect(sidebar().querySelector('[data-group="portfolio"]')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Show' })).toBeNull();
  });
  it('Welcome lists a Portfolio card with its six sections', async () => {
    mountApp();
    act(() => goSection('home'));
    await screen.findByRole('heading', { level: 1 });
    const card = within(screen.getByRole('main')).getByRole('button', { name: /Portfolio/ });
    expect(card.textContent).toContain('6');   // the count pill: Products, Overrides, Knowledge transfer, Waves, Consolidation and Portfolio stress
  });
});
