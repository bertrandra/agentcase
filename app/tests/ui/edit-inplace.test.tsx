// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { axeViolations } from '../helpers/axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { undo } from '@/controllers/history';
import { isOverridden, resolveProduct } from '@/domain/portfolio';
import { freshStore } from '../store/helpers';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';
import { keysOf, setScopeOverride } from '../helpers/scope';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const edit = () => screen.getByRole('combobox', { name: 'Change' }) as HTMLSelectElement;
const pick = (v: string) => fireEvent.change(edit(), { target: { value: v } });
const region = (name: RegExp) => screen.getByRole('region', { name });
const portfolio = () => act(() => { setDisplayScope({ kind: 'portfolio' }); });
const noViolation = async (el: Element) => {
  expect(await axeViolations(el)).toEqual([]);
};

describe('top bar: the "Change" dropdown', () => {
  it('one native select named "Change" (label "✏️ Change", icon hidden): All products + "<name>" per product; no radio group, no "Editing:" chip', () => {
    mountApp();
    const label = edit().closest('label')!;
    expect(label.textContent).toMatch(/^✏️Change/);
    expect(label.querySelector('.ac-prodsel-icon')!.getAttribute('aria-hidden')).toBe('true');
    expect([...edit().options].map((o) => [o.value, o.textContent])).toEqual([['all', 'All products'], [ids[0], 'Product 1'], [ids[1], 'B'], [ids[2], 'C']]);
    expect(screen.queryByRole('radiogroup', { name: 'Change' })).toBeNull();
    expect(document.querySelector('.ac-editing')).toBeNull();
  });
  it('a product: it becomes the edited one, scope "product", Show stays; the select value and the live region follow; never an undo step', () => {
    mountApp(); portfolio();
    expect(edit().value).toBe('all');
    pick(ids[1]);
    expect([pf().activeProductId, pf().editScope, pf().displayScope]).toEqual([ids[1], 'product', { kind: 'portfolio' }]);
    expect(edit().value).toBe(ids[1]);
    expect(screen.getByRole('status').textContent).toContain('Changing B');
    pick('all');
    expect([pf().activeProductId, pf().editScope]).toEqual([ids[1], 'all']);
    expect(edit().value).toBe('all');
    expect(screen.getByRole('status').textContent).toContain('Changing all products');
    expect(screen.getByRole('button', { name: /^Undo/ }).hasAttribute('disabled')).toBe(true);   // view state: no undo step
  });
  it('a Wave view lists the wave\'s products first, then the others', () => {
    mountApp(); act(() => { setDisplayScope({ kind: 'wave', id: waves[1] }); });
    const groups = [...edit().querySelectorAll('optgroup')].map((g) => [g.label, [...g.querySelectorAll('option')].map((o) => o.textContent)]);
    expect(groups).toEqual([['Wave: Wave 2', ['C']], ['Other products', ['Product 1', 'B']]]);
  });
  it('Product view: choosing another product shows it (Show follows the edited product)', () => {
    mountApp();
    pick(ids[2]);
    expect((screen.getByRole('combobox', { name: 'Show' }) as HTMLSelectElement).value).toBe(`product:${ids[2]}`);
  });
  it('axe: the top bar has no violation', async () => {
    mountApp(); portfolio();
    await noViolation(screen.getByRole('banner'));
  });
});

describe('an input section in a Portfolio view is editable in place', () => {
  it('Change = All products: the section on the COMMON values below the summary; an edit writes common (one undo step); an overriding product keeps its value',
    async () => {
    setScopeOverride(ids[1], { selectedArtefacts: keysOf(pf().common).selectedArtefacts.slice(0, 1) });
    mountApp('scope-sel'); portfolio();
    await sectionReady(/Scope/);
    expect(screen.getByRole('table', { name: /Artefact selection by product/ })).toBeTruthy();   // the summary stays on top
    const r = region(/^Changing all products/);
    const note = await within(r).findByRole('note', { name: 'Process (artefacts in scope): 1 product overrides this' }, { timeout: 15000 });
    expect(note.textContent).toContain('1 product overrides this: B — it keeps its value');
    const own = keysOf({ BPMN: pf().products[1]!.overrides.BPMN! }).selectedArtefacts, before = keysOf(pf().common).selectedArtefacts.length;
    fireEvent.click(within(r).getByRole('button', { name: 'Clear all' }));
    const cleared = keysOf(pf().common).selectedArtefacts;
    expect(cleared.length).toBeLessThan(before);
    expect(keysOf(resolveProduct(pf(), ids[2])).selectedArtefacts).toEqual(cleared);
    expect(keysOf({ BPMN: pf().products[1]!.overrides.BPMN! }).selectedArtefacts).toBe(own);
    expect(pf().products[0]!.overrides).toEqual({});
    act(() => { undo(); });
    expect(keysOf(pf().common).selectedArtefacts.length).toBe(before);
    fireEvent.click(within(r).getByRole('button', { name: 'Back to shared: Process (artefacts in scope) for B' }));
    expect(isOverridden(pf().products[1]!, 'BPMN')).toBe(false);
    expect(within(r).queryByText(/override this/)).toBeNull();
  });
  it('Change = a product: the real section for it, with the banner; an edit creates its override, the common values do not move', async () => {
    mountApp('scope-sel'); portfolio(); pick(ids[1]);
    await sectionReady(/Scope/);
    const r = region(/^Changing B only/), common = keysOf(pf().common).selectedArtefacts;
    await within(r).findByRole('button', { name: 'Clear all' }, { timeout: 15000 });
    expect(within(r).getByRole('note').textContent).toBe('Changing B only — the results above and elsewhere still show the Portfolio.');
    fireEvent.click(within(r).getByRole('button', { name: 'Clear all' }));
    expect(keysOf({ BPMN: pf().products[1]!.overrides.BPMN! }).selectedArtefacts.length).toBeLessThan(common.length);
    expect(keysOf(pf().common).selectedArtefacts).toBe(common);
  });
  it('the entry team is per product: a hint for All products, the team editor for a product', async () => {
    mountApp('team-in'); portfolio();
    await sectionReady(/Input team/);
    expect(within(region(/^Changing all products/)).getByText('The team is per product — pick a product in Change to change it.')).toBeTruthy();
    pick(ids[2]);
    expect(await within(region(/^Changing C only/)).findByLabelText('Total AS-IS team (FTE)', {}, { timeout: 15000 })).toBeTruthy();
  });
  it('a Wave view: the banner names the wave', async () => {
    mountApp('scope-sel'); act(() => { setDisplayScope({ kind: 'wave', id: waves[0] }); }); pick(ids[0]);
    await sectionReady(/Scope/);
    expect(within(region(/^Changing Product 1 only/)).getByRole('note').textContent).toContain('still show the Wave Wave 1.');
  });
  it('axe: the section with its in-place editor has no violation (All products and a product)', async () => {
    setScopeOverride(ids[1], { selectedArtefacts: [] });
    mountApp('scope-sel'); portfolio();
    await sectionReady(/Scope/);
    await noViolation(screen.getByRole('main'));
    pick(ids[1]);
    await noViolation(screen.getByRole('main'));
  });
  it('one product: no Change dropdown, no in-place editor', async () => {
    freshStore();
    mountApp('scope-sel'); act(() => { setDisplayScope({ kind: 'portfolio' }); });
    await sectionReady(/Scope/);
    expect(screen.queryByRole('combobox', { name: 'Change' })).toBeNull();
    expect(document.querySelector('.ac-inplace, .ac-keepers')).toBeNull();
  });
});
