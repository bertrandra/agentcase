// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setPersona } from '@/controllers/persona';
import { addPersona, addPersonaSection, removePersonaSection } from '@/controllers/pdcPersonas';
import { appStore } from '@/store/instance';
import { NavZone } from '@/ui/shell/NavZone';
import Personas from '@/ui/sections/configure/personas';
import { APP_SECTIONS, LEGACY_SECTIONS, SECTIONS } from '@/ui/zones/registry';
import { legacyText, tablesOf } from '../../helpers/economics';
import { missingNumbers, renderedText } from '../../helpers/parity';
import { loadCase, pdc, PDC_FIXTURES } from '../../helpers/pdc';

afterEach(cleanup);
const FOUR = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
const doc = () => appStore().getState().doc;
const personas = () => doc().PERSONAS as { id: string; label: string; order: number; compactNav?: boolean; default?: boolean }[];
const lists = () => doc().PERSONA_SECTIONS as Record<string, string[]>;

describe('personas section', () => {
  it.each(FOUR)('shows every figure the legacy section showed (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Personas />), legacy = legacyText(id, 'personas');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it.each(PDC_FIXTURES)('reproduces the legacy persona table cell by cell (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Personas />);
    expect(tablesOf(container)[0]).toEqual(pdc<{ table: string[][] }>('pdc_personas', id).table);
  });
  it('add, duplicate, rename, reorder, hide-menu, default and delete go through commands and undo', () => {
    loadCase('golden');
    const { container } = render(<Personas />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Executive'), { target: { value: 'Executive' } });
    fireEvent.click(screen.getByText('➕ Add'));
    expect(personas().at(-1)).toMatchObject({ id: 'executive', label: 'Executive', order: 6 });
    expect(lists().executive).toEqual([]);
    fireEvent.click(within(container.querySelectorAll('tbody tr')[2]! as HTMLElement).getByText('⎘ Duplicate'));   // builder: order 4 -> 3rd row
    expect(personas().some((p) => p.id === 'builder-copy')).toBe(true);
    expect(lists()['builder-copy']).toEqual(lists().builder);
    fireEvent.click(screen.getByLabelText('Default persona admin'));
    expect(personas().filter((p) => p.default).map((p) => p.id)).toEqual(['admin']);
    fireEvent.click(screen.getByLabelText('Hide menu for admin'));
    expect(personas().find((p) => p.id === 'admin')!.compactNav).toBe(true);
    fireEvent.change(screen.getByLabelText('Order of admin'), { target: { value: '1' } });
    expect(container.querySelectorAll('tbody tr')[1]!.textContent).toContain('admin');   // re-sorted by order
    const row = () => [...container.querySelectorAll('tbody tr')].find((r) => r.textContent!.includes('executive'))!;
    fireEvent.click(within(row() as HTMLElement).getByText('✎ Rename'));
    fireEvent.change(screen.getByLabelText('New label'), { target: { value: 'Board member' } });
    fireEvent.click(screen.getByText('✓ Save'));
    expect(personas().find((p) => p.id === 'executive')!.label).toBe('Board member');
    fireEvent.click(within(row() as HTMLElement).getByText('✕ Delete'));
    expect(personas().some((p) => p.id === 'executive')).toBe(true);   // armed, not yet deleted
    fireEvent.click(screen.getByText('✓ Confirm'));
    expect(personas().some((p) => p.id === 'executive')).toBe(false);
    expect('executive' in lists()).toBe(false);
    act(() => appStore().undo());
    expect(personas().some((p) => p.id === 'executive')).toBe(true);
    expect(lists().executive).toEqual([]);
  });
  it('the protected persona cannot be renamed or deleted', () => {
    loadCase('golden');
    const { container } = render(<Personas />);
    const advanced = container.querySelectorAll('tbody tr')[0] as HTMLElement;
    expect(within(advanced).queryByText('✎ Rename')).toBeNull();
    expect(within(advanced).queryByText('✕ Delete')).toBeNull();
  });
  it('deleting the active persona falls back to Advanced', () => {
    loadCase('golden');
    act(() => setPersona('admin'));
    render(<Personas />);
    fireEvent.click(screen.getAllByText('✕ Delete')[2]!);   // clientcase, builder, admin
    fireEvent.click(screen.getByText('✓ Confirm'));
    expect(appStore().getState().portfolio.persona).toBe('advanced');   // the tab's persona (view state, D3)
  });
  it('section assignment adds and removes sections of a persona', () => {
    loadCase('golden');
    render(<Personas />);
    fireEvent.click(screen.getByText('🧩 Section assignment'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } });
    expect(within(screen.getByLabelText('Sections of Admin')).getAllByRole('listitem'))
      .toHaveLength(lists().admin!.length + 1);   // + Brand & theme (an app section, by default)
    fireEvent.change(screen.getByLabelText('Available sections'), { target: { value: 'financial' } });
    fireEvent.click(screen.getByText('➕ Add to Admin'));
    expect(lists().admin).toContain('financial');
    fireEvent.click(screen.getByLabelText(`Remove ${SECTIONS.find((x) => x.id === 'financial')!.label}`));
    expect(lists().admin).not.toContain('financial');
  });
  it('menu groups: edit the description and colour, reorder, add, rename; a group that holds sections cannot be deleted', () => {
    loadCase('golden');
    render(<Personas />);
    fireEvent.click(screen.getByText('🗂️ Menu groups'));
    fireEvent.change(screen.getByLabelText('Description of frame'), { target: { value: 'Start here' } });
    expect((doc().GROUPS as { id: string; description: string }[]).find((g) => g.id === 'frame')!.description).toBe('Start here');
    fireEvent.change(screen.getByLabelText('Colour of frame'), { target: { value: '#123456' } });
    expect((doc().GROUP_COLORS as Record<string, string>).frame).toBe('#123456');
    fireEvent.change(screen.getByPlaceholderText('e.g. Compliance'), { target: { value: 'Compliance' } });
    fireEvent.click(screen.getByText('➕ Add'));
    expect((doc().GROUPS as { id: string }[]).some((g) => g.id === 'compliance')).toBe(true);
    fireEvent.click(screen.getAllByText('✕ Delete')[0]!);
    expect(screen.getByRole('alert').textContent).toMatch(/Cannot delete .* section\(s\) still assigned/);
    fireEvent.click(screen.getAllByText('✕ Delete').at(-1)!);   // the new, empty group: armed ...
    fireEvent.click(screen.getByText('✓ Confirm'));            // ... and deleted
    expect((doc().GROUPS as { id: string }[]).some((g) => g.id === 'compliance')).toBe(false);
  });
});

describe('the navigation honours the document’s PERSONA_SECTIONS', () => {
  const labels = () => [...screen.getByRole('navigation', { name: 'Sections' }).querySelectorAll('[data-section]')].map((b) => b.textContent);
  it('adding or removing a section of the active persona changes the menu, live', () => {
    loadCase('golden');
    act(() => setPersona('admin'));
    render(<NavZone />);
    const before = labels();
    expect(before).toHaveLength(lists().admin!.length + 1);   // + 🎨 Brand & theme, an app section the navigation adds to Admin
    const extra = SECTIONS.find((s) => !lists().admin!.includes(s.id))!;
    act(() => addPersonaSection('admin', extra.id));
    expect(labels()).toContain(extra.label);
    act(() => removePersonaSection('admin', extra.id));
    expect(labels()).toEqual(before);
    act(() => appStore().undo());
    expect(labels()).toContain(extra.label);
  });
  it('a new persona starts with an empty menu and Advanced always sees every section', () => {
    loadCase('golden');
    act(() => { addPersona('Guest'); setPersona('guest'); });
    render(<NavZone />);
    expect(labels()).toEqual([]);
    act(() => setPersona('advanced'));
    expect(labels()).toHaveLength(LEGACY_SECTIONS.length + APP_SECTIONS.length);   // one product: Advanced sees the 79 case sections and the app section
  });
  it('a document without PERSONA_SECTIONS falls back to the shipped defaults', () => {
    const s = loadCase('golden');
    act(() => { s.dispatch({ type: 'test.clear', payload: null, label: 'clear', undoable: false,
      run(d) { delete (d as Record<string, unknown>).PERSONA_SECTIONS; } }); setPersona('builder'); });
    render(<NavZone />);
    expect(labels().length).toBeGreaterThan(20);
  });
});
