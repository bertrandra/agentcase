// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PersonaOrder, SectionRow } from '@/domain/nav/layout';
import type { MenuGroup } from '@/domain/pdc/personas';
import { appStore } from '@/store/instance';
import Personas from '@/ui/sections/configure/personas';
import { APP_SECTIONS, LEGACY_SECTIONS, SECTIONS } from '@/ui/zones/registry';
import { navInputs } from '../../helpers/nav';
import { loadCase } from '../../helpers/pdc';

beforeEach(() => { loadCase('golden'); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const label = (id: string) => SECTIONS.find((s) => s.id === id)!.label;
const row = (id: string) => (doc().sectionGroups as SectionRow[]).find((r) => r.id === id)!;
const open = (tab: RegExp) => { render(<Personas />); fireEvent.click(screen.getByRole('tab', { name: tab })); };
const undo = () => act(() => { appStore().undo(); });
const inGroup = (g: string) => navInputs(doc()).sections.filter((s) => s.group === g).sort((a, b) => a.groupSeq - b.groupSeq).map((s) => s.id);

describe('menu layout board', () => {
  it('shows one column per group with a card per section', () => {
    open(/Menu layout/);
    const board = within(screen.getByRole('list', { name: 'Menu layout' }));
    expect(board.getAllByRole('listitem')).toHaveLength((doc().GROUPS as MenuGroup[]).length);
    expect(document.querySelectorAll('[data-section]')).toHaveLength(LEGACY_SECTIONS.length + APP_SECTIONS.length);   // one product: no Portfolio column
  });
  it('↑ ↓ reorder a card inside its group (groupSeq 10, 20 …) and undo restores the order', () => {
    const first = inGroup('frame')[0]!, second = inGroup('frame')[1]!;
    open(/Menu layout/);
    fireEvent.click(screen.getByLabelText(`Move ${label(first)} down`));
    expect(inGroup('frame').slice(0, 2)).toEqual([second, first]);
    expect(row(first).groupSeq).toBe(20);
    expect(appStore().getState().history.undo.at(-1)!.label).toBe(`Move ${label(first)} down`);
    undo();
    expect(inGroup('frame').slice(0, 2)).toEqual([first, second]);
  });
  it('← → move a card to the previous / next group; the arrows at the ends do nothing', () => {
    const id = inGroup('frame')[0]!;
    open(/Menu layout/);
    const n = appStore().getState().history.undo.length;
    fireEvent.click(screen.getByLabelText(`Move ${label(id)} to the previous group`));
    expect(appStore().getState().history.undo).toHaveLength(n);
    fireEvent.click(screen.getByLabelText(`Move ${label(id)} to the next group`));
    expect(row(id).group).toBe('baseline');
    expect(inGroup('baseline').at(-1)).toBe(id);
    undo();
    expect(row(id).group).toBe('frame');
  });
  it('dragging a card onto another column changes its group; dropping on a card inserts before it', () => {
    const id = inGroup('frame')[0]!, target = inGroup('baseline')[1]!;
    open(/Menu layout/);
    fireEvent.dragStart(document.querySelector(`[data-section="${id}"]`)!);
    fireEvent.drop(document.querySelector(`[data-section="${target}"]`)!);
    expect(inGroup('baseline').indexOf(id)).toBe(inGroup('baseline').indexOf(target) - 1);
    expect(inGroup('frame')).not.toContain(id);
    undo();
    expect(inGroup('frame')[0]).toBe(id);
  });
  it('◀ ▶ move a group in the menu order, undoably; the MVP filter only shows MVP sections', () => {
    open(/Menu layout/);
    fireEvent.click(screen.getByLabelText(/Move the group 1 · Frame right/));
    const order = (id: string) => (doc().GROUPS as MenuGroup[]).find((g) => g.id === id)!.order;
    expect([order('frame'), order('baseline')]).toEqual([20, 10]);
    undo();
    expect([order('frame'), order('baseline')]).toEqual([10, 20]);
    fireEvent.click(screen.getByLabelText('Show MVP only'));
    expect(document.querySelectorAll('[data-section]').length).toBeLessThan(SECTIONS.length);
    expect(document.querySelectorAll('.is-mvp')).toHaveLength(document.querySelectorAll('[data-section]').length);
  });
});

describe('persona layout board', () => {
  const orderOf = () => (doc().PERSONA_SECTION_ORDER as PersonaOrder).admin ?? {};
  it('double-click assigns / removes a section for the persona', () => {
    open(/Persona layout/);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } });
    const card = () => document.querySelector(`[data-section="financial"]`)!;
    expect(card().className).toContain('is-off');
    fireEvent.doubleClick(card());
    expect((doc().PERSONA_SECTIONS as Record<string, string[]>).admin).toContain('financial');
    expect(card().className).not.toContain('is-off');
    fireEvent.doubleClick(card());
    expect((doc().PERSONA_SECTIONS as Record<string, string[]>).admin).not.toContain('financial');
  });
  it('↑ ↓ and drag reorder inside the group for that persona only, undoably', () => {
    const g = inGroup('frame'), last = g.at(-1)!;
    open(/Persona layout/);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } });
    fireEvent.click(screen.getByLabelText(`Move ${label(last)} up`));
    expect(orderOf()[last]).toBe((g.length - 1) * 10);
    expect((doc().PERSONA_SECTION_ORDER as PersonaOrder).builder).toBeUndefined();
    expect(inGroup('frame')).toEqual(g);   // the global order is untouched
    undo();
    expect(orderOf()[last]).toBeUndefined();
  });
});

describe('assignment order and sidebar display', () => {
  it('per-persona order fields, respace and inherit', () => {
    render(<Personas />);
    fireEvent.click(screen.getByRole('tab', { name: /Section assignment/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Order of board for admin'), { target: { value: '3' } });
    expect((doc().PERSONA_SECTION_ORDER as PersonaOrder).admin).toEqual({ board: 3 });
    fireEvent.click(screen.getByLabelText('Inherit the order of board'));
    expect((doc().PERSONA_SECTION_ORDER as PersonaOrder).admin).toEqual({});
    fireEvent.click(screen.getByText('↔ Respace ×10'));
    expect(Object.values((doc().PERSONA_SECTION_ORDER as PersonaOrder).admin!).sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });
  it('the display style switch writes SECTION_NAV_STYLE', () => {
    open(/Menu groups/);
    fireEvent.click(screen.getByLabelText('Tabs'));
    expect(doc().SECTION_NAV_STYLE).toBe('tabs');
    undo();
    expect(doc().SECTION_NAV_STYLE).toBe('buttons');
  });
});
