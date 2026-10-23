// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addBuiltinPersona } from '@/controllers/menuStructures';
import { setPersona } from '@/controllers/persona';
import { BUILTIN_STRUCTURES, type MenuStructure } from '@/domain/nav/structures';
import type { Persona } from '@/domain/pdc/personas';
import { appStore } from '@/store/instance';
import Home from '@/ui/sections/frame/home';
import Personas from '@/ui/sections/configure/personas';
import { NavZone } from '@/ui/shell/NavZone';
import { WizardBar } from '@/ui/shell/WizardBar';
import { LEGACY_SECTIONS, SECTIONS } from '@/ui/zones/registry';
import { loadCase } from '../../helpers/pdc';

beforeEach(() => { loadCase('golden'); });
afterEach(cleanup);
const BJ = BUILTIN_STRUCTURES[0]!, BJ_LABELS = [...BJ.groups].sort((a, b) => a.order - b.order).map((g) => g.label);
const doc = () => appStore().getState().doc;
const persona = (id: string) => (doc().PERSONAS as Persona[]).find((p) => p.id === id)!;
const stored = () => (doc().MENU_STRUCTURES ?? []) as MenuStructure[];
const open = (tab: RegExp) => { render(<Personas />); fireEvent.click(within(screen.getByRole('tablist', { name: 'Persona management views' })).getByRole('tab', { name: tab })); };
const pick = (label: string | RegExp, value: string) => fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } });
const undo = () => act(() => { appStore().undo(); });
const all = () => LEGACY_SECTIONS.map((s) => s.id);

describe('🧩 Section assignment, as in the legacy tab', () => {
  it('one persona picker on top, then two pill sub-tabs: its sections and its guided sequence', () => {
    open(/Section assignment/);
    expect(screen.getByText('Pick a persona above to manage its sections.')).toBeTruthy();
    const pills = within(screen.getByRole('tablist', { name: 'Section assignment views' })).getAllByRole('tab');
    expect(pills.map((t) => t.textContent)).toEqual(['🧩 Section assignment', '🧭 Guided sequence (wizard)']);
    pick('Persona', 'admin');
    expect(screen.getByRole('list', { name: 'Sections of Admin' })).toBeTruthy();
    fireEvent.click(pills[1]!);
    expect(screen.getAllByRole('combobox', { name: 'Persona' })).toHaveLength(1);   // the wizard uses the picker above
    fireEvent.click(screen.getByLabelText(/Sequence enabled/));
    expect(persona('admin').seq!.on).toBe(true);
  });
  it('the persona’s menu structure is picked here (undoable; Standard = no field)', () => {
    open(/Section assignment/);
    pick('Persona', 'admin');
    pick('Menu structure of Admin', 'business-journey');
    expect(persona('admin').menuStructure).toBe('business-journey');
    undo();
    expect('menuStructure' in persona('admin')).toBe(false);
  });
  it('the guided sequence follows the persona’s structure: picker grouped by its groups, Generate from groups uses them', () => {
    open(/Section assignment/);
    pick('Persona', 'admin');
    pick('Menu structure of Admin', 'business-journey');
    fireEvent.click(screen.getByRole('tab', { name: /Guided sequence \(wizard\)/ }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add step' }));
    const groups = [...screen.getByRole('combobox', { name: 'Add a section to step 1' }).querySelectorAll('optgroup')].map((g) => g.label);
    expect(groups.every((l) => BJ_LABELS.includes(l))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '⚙️ Generate from groups' }));
    fireEvent.click(screen.getByRole('button', { name: '✓ Confirm' }));
    expect(persona('admin').seq!.steps.map((s) => s.label).every((l) => BJ_LABELS.includes(l))).toBe(true);
  });
});

describe('menu structures in Persona management', () => {
  it('editing a group of the selected structure leaves the standard structure unchanged', () => {
    const groups = JSON.stringify(doc().GROUPS), colors = JSON.stringify(doc().GROUP_COLORS);
    open(/Menu groups/);
    pick('Menu structure', 'business-journey');
    fireEvent.change(screen.getByLabelText('Description of frame'), { target: { value: 'Which deal?' } });
    fireEvent.change(screen.getByLabelText('Colour of frame'), { target: { value: '#123456' } });
    expect(stored().find((s) => s.id === 'business-journey')!.groups.find((g) => g.id === 'frame')!.description).toBe('Which deal?');
    expect(stored().find((s) => s.id === 'business-journey')!.colors.frame).toBe('#123456');
    expect(JSON.stringify(doc().GROUPS)).toBe(groups);
    expect(JSON.stringify(doc().GROUP_COLORS)).toBe(colors);
  });
  it('Duplicate creates a structure and selects it; a built-in or used structure cannot be deleted', () => {
    open(/Menu groups/);
    const bar = () => within(screen.getByRole('group', { name: 'Menu structure' }));
    expect(bar().getByRole('button', { name: '✕ Delete structure' }).hasAttribute('disabled')).toBe(true);   // Standard
    fireEvent.click(bar().getByRole('button', { name: '⎘ Duplicate structure' }));
    fireEvent.change(bar().getByLabelText('Menu structure name'), { target: { value: 'Lean' } });
    fireEvent.click(bar().getByRole('button', { name: '✓ Create' }));
    expect(stored().map((s) => s.id)).toEqual(['lean']);
    expect((screen.getByRole('combobox', { name: 'Menu structure' }) as HTMLSelectElement).value).toBe('lean');
    fireEvent.click(bar().getByRole('button', { name: '✕ Delete structure' }));
    fireEvent.click(bar().getByRole('button', { name: '✓ Confirm' }));
    expect(stored()).toEqual([]);
  });
  it('the Sections table edits group and order of the selected structure; tag and MVP are the section’s; a name opens its detail and live preview', () => {
    const rows = JSON.stringify(doc().sectionGroups);
    open(/📄 Sections/);
    pick('Menu structure', 'business-journey');
    expect(screen.getByRole('columnheader', { name: 'Personas using it' })).toBeTruthy();
    pick('Group of financial', 'frame');
    expect(stored()[0]!.placement.financial!.group).toBe('frame');
    expect(JSON.stringify(doc().sectionGroups)).toBe(rows);
    fireEvent.click(screen.getByRole('button', { name: '↔ Respace ×10 Group Seq' }));
    expect(stored()[0]!.placement.financial!.groupSeq % 10).toBe(0);
    pick('Tag of board', 'reads');
    fireEvent.click(screen.getByLabelText('Fast Path member board'));
    expect((doc().sectionGroups as { id: string; tag?: string; mvp?: boolean }[]).find((r) => r.id === 'board')).toMatchObject({ tag: 'reads', mvp: true });
    fireEvent.click(screen.getByRole('button', { name: SECTIONS.find((s) => s.id === 'run')!.label }));
    const detail = within(screen.getByRole('region', { name: /Details of/ }));
    expect(detail.getByRole('region', { name: /Live preview/ }).textContent).toContain('(selected)');
  });
});

describe('the navigation follows the active persona’s structure', () => {
  const groups = () => [...screen.getByRole('navigation', { name: 'Sections' }).querySelectorAll('[data-group]')].map((g) => g.querySelector('button span')!.textContent);
  it('switching persona switches the sidebar groups, the Welcome cards and the guided walk', () => {
    act(() => { addBuiltinPersona('business-journey', all()); setPersona('builder'); });
    render(<><NavZone /><Home /><WizardBar /></>);
    expect(groups().some((l) => l === '2 · Baseline')).toBe(true);
    act(() => setPersona('business-journey'));
    expect(groups()).toEqual(BJ_LABELS.filter((l) => l !== '📦 Portfolio'));   // one product: no Portfolio group
    expect(screen.getAllByTitle(/^Opens /).map((b) => b.title)).toEqual(BJ_LABELS.filter((l) => l !== '📦 Portfolio').map((l) => `Opens ${l}`));
    expect(screen.getByRole('region', { name: 'Guided sequence' }).textContent).toContain('(6 steps)');   // the Portfolio step only from two products on
  });
});
