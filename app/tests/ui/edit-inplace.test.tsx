// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { undo } from '@/controllers/history';
import { setProductOverride } from '@/controllers/productOverrides';
import { isOverridden, resolveProduct } from '@/domain/portfolio';
import { freshStore } from '../store/helpers';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const edit = () => screen.getByRole('combobox', { name: 'Edit' }) as HTMLSelectElement;
const pick = (v: string) => fireEvent.change(edit(), { target: { value: v } });
const chip = () => document.querySelector('.ac-top .ac-editing')!.textContent;
const region = (name: RegExp) => screen.getByRole('region', { name });
const portfolio = () => act(() => { setDisplayScope({ kind: 'portfolio' }); });
const noViolation = async (el: Element) => {
  const r = await axe.run(el as HTMLElement, { rules: { 'color-contrast': { enabled: false } } });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(' | ')}`)).toEqual([]);
};

describe('top bar: the "Edit" dropdown', () => {
  it('one native select named "Edit" (label "Edit:"): All products + "<name> only" per product; no radio group', () => {
    mountApp();
    expect(edit().closest('label')!.textContent).toMatch(/^Edit:/);
    expect([...edit().options].map((o) => [o.value, o.textContent])).toEqual([['all', 'All products'], [ids[0], 'Product 1 only'], [ids[1], 'B only'], [ids[2], 'C only']]);
    expect(screen.queryByRole('radiogroup', { name: 'Edit' })).toBeNull();
  });
  it('a product: it becomes the edited one, scope "product", the View stays; the chip and the live region follow; never an undo step', () => {
    mountApp(); portfolio();
    expect(chip()).toBe('Editing: All products');
    pick(ids[1]);
    expect([pf().activeProductId, pf().editScope, pf().displayScope]).toEqual([ids[1], 'product', { kind: 'portfolio' }]);
    expect(chip()).toBe('Editing: B');
    expect(screen.getByRole('status').textContent).toContain('Edit: B only');
    pick('all');
    expect([pf().activeProductId, pf().editScope]).toEqual([ids[1], 'all']);
    expect(chip()).toBe('Editing: All products');
    expect(pf()).toBeTruthy(); expect(screen.getByRole('button', { name: /^Undo/ }).hasAttribute('disabled')).toBe(true);
  });
  it('a Wave view lists the wave\'s products first, then the others', () => {
    mountApp(); act(() => { setDisplayScope({ kind: 'wave', id: waves[1] }); });
    const groups = [...edit().querySelectorAll('optgroup')].map((g) => [g.label, [...g.querySelectorAll('option')].map((o) => o.textContent)]);
    expect(groups).toEqual([['Wave: Wave 2', ['C only']], ['Other products', ['Product 1 only', 'B only']]]);
  });
  it('Product view: choosing another product shows it (the View follows the edited product)', () => {
    mountApp();
    pick(ids[2]);
    expect((screen.getByRole('combobox', { name: 'View' }) as HTMLSelectElement).value).toBe(`product:${ids[2]}`);
  });
  it('axe: the top bar has no violation', async () => {
    mountApp(); portfolio();
    await noViolation(screen.getByRole('banner'));
  });
});

describe('an input section in a Portfolio view is editable in place', () => {
  it('Edit = All products: the section on the COMMON values below the summary; an edit writes common (one undo step); an overriding product keeps its value', async () => {
    setProductOverride(ids[1], 'selectedArtefacts', pf().common.selectedArtefacts.slice(0, 1));
    mountApp('scope-sel'); portfolio();
    await sectionReady(/Scope/);
    expect(screen.getByRole('table', { name: /Artefact selection by product/ })).toBeTruthy();   // the summary stays on top
    const r = region(/^Edit in place: All products/);
    const note = await within(r).findByRole('note', { name: 'Selected SDLC artefacts: 1 product overrides this' }, { timeout: 15000 });
    expect(note.textContent).toContain('1 product overrides this: B — it keeps its value');
    const own = pf().products[1]!.overrides.selectedArtefacts, before = pf().common.selectedArtefacts.length;
    fireEvent.click(within(r).getByRole('button', { name: 'Clear all' }));
    const cleared = pf().common.selectedArtefacts;
    expect(cleared.length).toBeLessThan(before);
    expect(resolveProduct(pf(), ids[2]).selectedArtefacts).toEqual(cleared);
    expect(pf().products[1]!.overrides.selectedArtefacts).toBe(own);
    expect(pf().products[0]!.overrides).toEqual({});
    act(() => { undo(); });
    expect(pf().common.selectedArtefacts.length).toBe(before);
    fireEvent.click(within(r).getByRole('button', { name: 'Reset to common: Selected SDLC artefacts for B' }));
    expect(isOverridden(pf().products[1]!, 'selectedArtefacts')).toBe(false);
    expect(within(r).queryByText(/override this/)).toBeNull();
  });
  it('Edit = a product: the real section for it, with the banner; an edit creates its override, the common values do not move', async () => {
    mountApp('scope-sel'); portfolio(); pick(ids[1]);
    await sectionReady(/Scope/);
    const r = region(/^Edit in place: B only/), common = pf().common.selectedArtefacts;
    await within(r).findByRole('button', { name: 'Clear all' }, { timeout: 15000 });
    expect(within(r).getByRole('note').textContent).toBe('Editing B only — results above and elsewhere still show the Portfolio view.');
    fireEvent.click(within(r).getByRole('button', { name: 'Clear all' }));
    expect(pf().products[1]!.overrides.selectedArtefacts!.length).toBeLessThan(common.length);
    expect(pf().common.selectedArtefacts).toBe(common);
  });
  it('the entry team is per product: a hint for All products, the team editor for a product', async () => {
    mountApp('team-in'); portfolio();
    await sectionReady(/Input team/);
    expect(within(region(/^Edit in place: All products/)).getByText('The team is per product — pick a product in Edit to change it.')).toBeTruthy();
    pick(ids[2]);
    expect(await within(region(/^Edit in place: C only/)).findByLabelText('Total AS-IS team (FTE)', {}, { timeout: 15000 })).toBeTruthy();
  });
  it('a Wave view: the banner names the wave', async () => {
    mountApp('scope-sel'); act(() => { setDisplayScope({ kind: 'wave', id: waves[0] }); }); pick(ids[0]);
    await sectionReady(/Scope/);
    expect(within(region(/^Edit in place: Product 1 only/)).getByRole('note').textContent).toContain('still show the Wave Wave 1 view');
  });
  it('axe: the section with its in-place editor has no violation (All products and a product)', async () => {
    setProductOverride(ids[1], 'selectedArtefacts', []);
    mountApp('scope-sel'); portfolio();
    await sectionReady(/Scope/);
    await noViolation(screen.getByRole('main'));
    pick(ids[1]);
    await noViolation(screen.getByRole('main'));
  });
  it('one product: no Edit dropdown, no in-place editor', async () => {
    freshStore();
    mountApp('scope-sel'); act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await sectionReady(/Scope/);
    expect(screen.queryByRole('combobox', { name: 'Edit' })).toBeNull();
    expect(document.querySelector('.ac-inplace, .ac-keepers')).toBeNull();
  });
});
