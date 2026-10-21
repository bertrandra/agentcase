// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DynSection } from '@/domain/pdc/board';
import { appStore } from '@/store/instance';
import Board from '@/ui/sections/configure/board';
import { DynamicSectionPage, DynamicSectionView } from '@/ui/sections/configure/board/DynamicSectionView';
import { GROUPS } from '@/ui/zones/registry';
import { loadCase } from '../../helpers/pdc';

afterEach(cleanup);
const dyn = () => (appStore().getState().doc.dynamicSections as DynSection[])[0]!;
const undo = (n = 1) => act(() => { for (let i = 0; i < n; i++) appStore().undo(); });
/** Pick an option of a lazy select: its list only exists once the user is choosing. */
const choose = (label: string, value: string) => { const el = screen.getByLabelText(label); fireEvent.mouseDown(el); fireEvent.change(el, { target: { value } }); };
const text = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

/** A board with one generated dashboard, its Configure panel open. */
function open() {
  loadCase('golden');
  const view = render(<Board />);
  fireEvent.click(screen.getByLabelText(new RegExp(GROUPS.find((x) => x.id === 'tune')!.label)));
  fireEvent.click(screen.getByText('➕ Generate dashboard'));
  fireEvent.click(screen.getByText('⚙️ Configure'));
  return view;
}

describe('body rows editor', () => {
  it('adds rows, edits label / source / variable / format / default, and undoes each edit', () => {
    open();
    fireEvent.click(screen.getByText('➕ Add row'));
    expect(dyn().rows).toHaveLength(1);
    expect(dyn().rows[0]).toMatchObject({ id: 'row-1', label: 'New row', var: null, format: null });
    fireEvent.change(text('Label of row-1'), { target: { value: 'Knowledge' } });
    choose('Source of row-1', 'knowledge');
    choose('Var of row-1', 'khMultiplier');
    expect(dyn().rows[0]).toMatchObject({ label: 'Knowledge', source: 'knowledge', var: 'khMultiplier' });
    choose('Format of row-1', 'PCT');
    fireEvent.change(text('Default of row-1'), { target: { value: 'n/a' } });
    expect(dyn().rows[0]).toMatchObject({ format: 'PCT', defaultValue: 'n/a' });
    undo(); undo();
    expect(dyn().rows[0]).toMatchObject({ format: null, defaultValue: '' });
    undo(3);
    expect(dyn().rows[0]).toMatchObject({ label: 'New row', var: null });
    undo();
    expect(dyn().rows).toHaveLength(0);
    act(() => appStore().redo());
    expect(dyn().rows).toHaveLength(1);
  });

  it('a source that does not offer the bound variable unbinds it', () => {
    open();
    fireEvent.click(screen.getByText('➕ Add row'));
    choose('Source of row-1', 'knowledge');
    choose('Var of row-1', 'khMultiplier');
    choose('Source of row-1', 'financial');
    expect(dyn().rows[0]!.var).toBeNull();
    choose('Var of row-1', 'netSavY3');   // GLOBAL variables stay on offer
    choose('Source of row-1', 'knowledge');
    expect(dyn().rows[0]!.var).toBe('netSavY3');
  });

  it('reorders rows with the arrows and the order field; the first / last arrows are disabled', () => {
    open();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByText('➕ Add row'));
    const order = () => [...dyn().rows].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).map((r) => r.id);
    expect(order()).toEqual(['row-1', 'row-2', 'row-3']);
    expect((screen.getByLabelText('Move row-1 up') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Move row-3 down') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Move row-3 up'));
    expect(order()).toEqual(['row-1', 'row-3', 'row-2']);
    fireEvent.change(text('Order of row-1'), { target: { value: '9' } });
    expect(order()).toEqual(['row-3', 'row-2', 'row-1']);
    undo();
    expect(order()).toEqual(['row-1', 'row-3', 'row-2']);
    undo();
    expect(order()).toEqual(['row-1', 'row-2', 'row-3']);
  });

  it('removes a row and brings it back with undo', () => {
    open();
    fireEvent.click(screen.getByText('➕ Add row'));
    fireEvent.click(screen.getByText('➕ Add row'));
    fireEvent.click(screen.getByLabelText('Remove row-1'));
    expect(dyn().rows.map((r) => r.id)).toEqual(['row-2']);
    undo();
    expect(dyn().rows.map((r) => r.id)).toEqual(['row-1', 'row-2']);
  });

  it('edits the description and adds, switches and removes cards', () => {
    open();
    fireEvent.change(screen.getByLabelText(/^Description of/), { target: { value: 'Steering view' } });
    expect(dyn().description).toBe('Steering view');
    const n = dyn().cards.length;
    fireEvent.click(screen.getByText('➕ Add card'));
    const id = `card-${dyn().id}-${n + 1}`;
    expect(dyn().cards).toHaveLength(n + 1);
    expect(dyn().cards[n]).toMatchObject({ CARD_ID: id, CARD_ENABLED: false, CARD_SOURCE_SECTION: dyn().id });
    fireEvent.click(screen.getByLabelText(`On ${id}`));
    expect(dyn().cards[n]!.CARD_ENABLED).toBe(true);
    choose(`Source of ${id}`, 'knowledge');
    choose(`Headline of ${id}`, 'khMultiplier');
    fireEvent.change(text(`Key figure 1 label of ${id}`), { target: { value: 'Hub' } });
    expect(dyn().cards[n]).toMatchObject({ CARD_IMPACT_VAR: 'khMultiplier', CARD_KEY1_LABEL: 'Hub' });
    choose(`Source of ${id}`, 'financial');
    expect(dyn().cards[n]!.CARD_IMPACT_VAR).toBeNull();
    fireEvent.click(screen.getByLabelText(`Remove ${id}`));
    expect(dyn().cards).toHaveLength(n);
    undo();
    expect(dyn().cards).toHaveLength(n + 1);
  });
});

describe('dynamic section view', () => {
  it('shows the cards and the bound rows with live values that follow the case', () => {
    open();
    fireEvent.click(screen.getByText('➕ Add row'));
    fireEvent.change(text('Label of row-1'), { target: { value: 'Artefacts' } });
    choose('Var of row-1', 'artefactsInScope');
    cleanup();
    const { container } = render(<DynamicSectionView section={dyn()} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain(dyn().title);
    expect(within(screen.getByRole('list', { name: 'Body rows' })).getByText('Artefacts').nextSibling?.textContent).toBe('10');
    expect(container.textContent).toContain('Headlines · Savings');
    expect(container.textContent).toContain('€892K');
  });

  it('looks the section up by id and says so when it is gone', () => {
    open();
    const id = dyn().id;
    cleanup();
    const { container, rerender } = render(<DynamicSectionPage id={id} />);
    expect(container.textContent).toContain(dyn().title);
    rerender(<DynamicSectionPage id="dyn-missing" />);
    expect(container.textContent).toContain('no longer exists');
  });
});
