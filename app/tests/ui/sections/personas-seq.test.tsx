// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { removePersonaSection } from '@/controllers/pdcPersonas';
import type { PersonaOrder } from '@/domain/nav/layout';
import type { Persona, PersonaSeq } from '@/domain/pdc/personas';
import { appStore } from '@/store/instance';
import Personas from '@/ui/sections/configure/personas';
import { SECTIONS } from '@/ui/zones/registry';
import { loadCase } from '../../helpers/pdc';

beforeEach(() => { loadCase('golden'); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const seq = (id: string): PersonaSeq | undefined => (doc().PERSONAS as Persona[]).find((p) => p.id === id)?.seq;
const undo = () => act(() => { appStore().undo(); });
const label = (id: string) => SECTIONS.find((s) => s.id === id)!.label;
const editor = (persona: string) => {
  render(<Personas />);
  fireEvent.click(screen.getByRole('tab', { name: /Guided sequence/ }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Persona' }), { target: { value: persona } });
};
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('guided-sequence editor', () => {
  it('enables / disables the sequence, adds, labels, moves and removes steps — each undoable', () => {
    editor('admin');
    fireEvent.click(screen.getByLabelText(/Sequence enabled/));
    expect(seq('admin')!.on).toBe(true);
    click('+ Add step'); click('+ Add step');
    expect(seq('admin')!.steps).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Label of step 2'), { target: { value: 'Second' } });
    click('Move step 2 up');
    expect(seq('admin')!.steps.map((s) => s.label)).toEqual(['Second', 'New step']);
    click('Remove step 1');
    expect(seq('admin')!.steps.map((s) => s.label)).toEqual(['New step']);
    undo(); undo(); undo();
    expect(seq('admin')!.steps.map((s) => s.label)).toEqual(['New step', 'New step']);
    undo(); undo();
    expect(seq('admin')!.on).toBe(true);
    undo();
    expect(seq('admin')?.on ?? false).toBe(false);
  });
  it('adds a section from the grouped picker, reorders it with the arrows, drag and drop, and removes it', () => {
    editor('admin');
    click('+ Add step');
    const pick = screen.getByLabelText('Add a section to step 1');
    expect(pick.querySelectorAll('optgroup').length).toBeGreaterThan(5);
    for (const id of ['home', 'board', 'personas']) fireEvent.change(pick, { target: { value: id } });
    expect(seq('admin')!.steps[0]!.sections).toEqual(['home', 'board', 'personas']);
    expect(within(pick).queryByRole('option', { name: label('home') })).toBeNull();   // already in the step
    click(`Move ${label('home')} later in step 1`);
    expect(seq('admin')!.steps[0]!.sections).toEqual(['board', 'home', 'personas']);
    const tag = (id: string) => screen.getByLabelText(`Remove ${label(id)} from step 1`).closest('li')!;
    fireEvent.dragStart(tag('personas'));
    fireEvent.drop(tag('board'));
    expect(seq('admin')!.steps[0]!.sections).toEqual(['personas', 'board', 'home']);
    click(`Remove ${label('board')} from step 1`);
    expect(seq('admin')!.steps[0]!.sections).toEqual(['personas', 'home']);
    undo();
    expect(seq('admin')!.steps[0]!.sections).toEqual(['personas', 'board', 'home']);
  });
  it('Generate from groups makes one step per group (asks before replacing), enabled, and undo restores the previous sequence', () => {
    editor('clientcase');
    const before = JSON.stringify(seq('clientcase'));
    click('⚙️ Generate from groups');
    expect(seq('clientcase')).toEqual(JSON.parse(before));   // waits for the confirmation
    click('✓ Confirm');
    const g = seq('clientcase')!;
    expect(g.on).toBe(true);
    expect(g.steps.length).toBeGreaterThan(3);
    expect(g.steps.flatMap((s) => s.sections)).not.toContain('home');
    expect(screen.getByRole('status').textContent).toMatch(/Generated \d+ step/);
    undo();
    expect(JSON.stringify(seq('clientcase'))).toBe(before);
  });
  it('Sync section order writes only this persona\'s order; Sync menu previews then replaces the menu with the sequence', () => {
    const dropped = seq('clientcase')!.steps[0]!.sections[0]!;
    act(() => removePersonaSection('clientcase', dropped));
    editor('clientcase');
    click(/Sync section order to sequence/);
    const order = doc().PERSONA_SECTION_ORDER as PersonaOrder;
    expect(Object.keys(order)).toEqual(['clientcase']);
    expect(Object.values(order.clientcase!).every((n) => n >= 1)).toBe(true);
    click(/Sync menu to sequence/);
    const dlg = within(screen.getByRole('alertdialog'));
    expect(dlg.getByText(/Add \(1\)/).textContent).toContain(label(dropped));
    click('✓ Confirm');
    const list = (doc().PERSONA_SECTIONS as Record<string, string[]>).clientcase!;
    expect(list[0]).toBe('home');
    expect(new Set(list)).toEqual(new Set(['home', ...seq('clientcase')!.steps.flatMap((s) => s.sections)]));
    undo();
    expect((doc().PERSONA_SECTIONS as Record<string, string[]>).clientcase).not.toEqual(list);
  });
});
