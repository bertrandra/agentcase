// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readProcess } from '@/domain/process';
import { appStore } from '@/store/instance';
import Process from '@/ui/sections/scope/process';
import { resetProcessView } from '@/ui/sections/scope/process/view';
import { freshStore } from '../../store/helpers';

/**
 * 🧩 Process diagram canvas edits (owner's request 2026-11-04): the ⋯ menu of an activity (edit details, delete), "+ Add activity" opening the
 * activity panel, the phase filter, the role in the activity panel. The drag itself needs a real layout (tools/e2e-bpmn-editor.mjs).
 */
const doc = () => appStore().getState().doc.BPMN as never;
const button = (text: string): HTMLButtonElement => [...document.querySelectorAll('button')].find((b) => b.textContent!.trim() === text)!;
const more = (id: string) => [...document.querySelectorAll('.ac-proc-canvas .ac-bpmn-more')]
  .find((g) => g.querySelector('title')!.textContent!.startsWith(`Actions on ${id}:`))!;
beforeEach(() => { freshStore(); resetProcessView(); });
afterEach(cleanup);

describe('Process diagram canvas edits', { timeout: 90_000 }, () => {
  it('⋯ → Edit details opens the activity panel; ⋯ → Delete activity removes it, one undo step', () => {
    render(<Process />);
    const id = readProcess(doc()).activities[2]!.id;
    act(() => { fireEvent.click(more(id)); });
    expect(document.querySelector('[role="menu"]')!.getAttribute('aria-label')).toBe(`Actions on activity ${id}`);
    act(() => { fireEvent.click(button('✏️ Edit details')); });
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.getElementById('ac-proc-activity')!.querySelector('h2')!.textContent).toContain(id);
    const n = appStore().getState().history.undo.length;
    act(() => { fireEvent.click(more(id)); });
    act(() => { fireEvent.click(button('🗑️ Delete activity')); });
    expect(readProcess(doc()).activities.some((a) => a.id === id)).toBe(false);
    expect(appStore().getState().history.undo.length).toBe(n + 1);
    expect(document.getElementById('ac-proc-activity')).toBeNull();
  });
  it('Escape closes the menu; the programme diagram has no ⋯', () => {
    render(<Process />);
    const id = readProcess(doc()).activities[0]!.id;
    act(() => { fireEvent.click(more(id)); });
    act(() => { fireEvent.keyDown(document.querySelector('[role="menu"]')!, { key: 'Escape' }); });
    expect(document.querySelector('[role="menu"]')).toBeNull();
    const diagrams = document.querySelectorAll('.ac-proc-diagram');
    expect(diagrams.length).toBeGreaterThan(1);
    expect(diagrams[1]!.querySelector('.ac-bpmn-more')).toBeNull();
  });
  it('+ Add activity adds one in the filtered phase and opens its panel; the panel\'s role moves it to that role', () => {
    render(<Process />);
    const v = readProcess(doc()), ph = v.phases[2]!.id, frame = document.querySelector('.ac-proc-diagram')!;
    act(() => { fireEvent.change(frame.querySelector<HTMLSelectElement>('select[id$="-ph"]')!, { target: { value: ph } }); });
    act(() => { fireEvent.click(button('＋ Add activity')); });
    const added = readProcess(doc()).activities.find((a) => !v.activities.some((x) => x.id === a.id))!;
    expect(added.phase).toBe(ph);
    expect(added.name).toBe('New activity');
    const panel = document.getElementById('ac-proc-activity')!;
    expect(panel.querySelector('h2')!.textContent).toContain(added.id);
    const role = [...panel.querySelectorAll('label')].find((l) => l.textContent!.startsWith('Role'))!.querySelector('select')!;
    act(() => { fireEvent.change(role, { target: { value: 'role-qa' } }); });
    expect(readProcess(doc()).activities.find((a) => a.id === added.id)!.humanPerformer).toBe('role-qa');
  });
  it('🔗 Add a link, then a click on an activity of the phase links them; a click on a link selects it (two handles) and Delete link removes it', () => {
    render(<Process />);
    const flows = () => readProcess(doc()).flows.filter((f) => !f.rework), n = appStore().getState().history.undo.length;
    const shape = (id: string) => more(id).parentElement!;
    act(() => { fireEvent.click(more('A001')); });
    act(() => { fireEvent.click(button('🔗 Add a link')); });
    expect(document.querySelector('.ac-proc-hint')!.textContent).toContain('A001');
    act(() => { fireEvent.click(shape('A003')); });
    expect(flows().some((f) => f.source === 'A001' && f.target === 'A003')).toBe(true);
    expect(appStore().getState().history.undo.length).toBe(n + 1);
    expect(document.querySelector('.ac-proc-hint')).toBeNull();
    const id = flows().find((f) => f.source === 'A001' && f.target === 'A003')!.id;
    const hit = [...document.querySelectorAll('.ac-proc-canvas .ac-bpmn-edge-hit')]
      .find((h) => h.querySelector('title')!.textContent!.startsWith('Link A001 → A003'))!;
    act(() => { fireEvent.click(hit); });
    expect(document.querySelectorAll('.ac-proc-canvas .ac-bpmn-handle').length).toBe(2);
    act(() => { fireEvent.click(button('🗑️ Delete link')); });
    expect(flows().some((f) => f.id === id)).toBe(false);
    expect(document.querySelectorAll('.ac-proc-canvas .ac-bpmn-handle').length).toBe(0);
  });
  it('a link to another phase is refused (no step); Escape leaves the link mode', () => {
    render(<Process />);
    const v = readProcess(doc()), a = v.activities[0]!, other = v.activities.find((x) => x.phase !== a.phase && !x.regulatory)!;
    const n = appStore().getState().history.undo.length;
    act(() => { fireEvent.click(more(a.id)); });
    act(() => { fireEvent.click(button('🔗 Add a link')); });
    act(() => { fireEvent.click(more(other.id).parentElement!); });
    expect(appStore().getState().history.undo.length).toBe(n);
    act(() => { fireEvent.click(more(a.id)); });
    act(() => { fireEvent.click(button('🔗 Add a link')); });
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(document.querySelector('.ac-proc-hint')).toBeNull();
  });
  it('📦 Create a sub-process of the picked activities; its ⋯ → Delete sub-process gives them back to the phase (one step each)', () => {
    render(<Process />);
    const subs = () => readProcess(doc()).subProcesses ?? [], n = appStore().getState().history.undo.length;
    act(() => { fireEvent.click(more('A002').parentElement!); });
    act(() => { fireEvent.click(more('A003').parentElement!, { ctrlKey: true }); });
    act(() => { fireEvent.click(more('A002')); });
    act(() => { fireEvent.click(button('📦 Create a sub-process (2 activities)')); });
    expect(subs().map((x) => x.id)).toEqual(['Sub_1']);
    expect(readProcess(doc()).activities.filter((a) => a.sub === 'Sub_1').map((a) => a.id)).toEqual(['A002', 'A003']);
    expect(appStore().getState().history.undo.length).toBe(n + 1);
    act(() => { fireEvent.click(more('Sub_1')); });
    act(() => { fireEvent.click(button('🗑️ Delete sub-process')); });
    expect(subs()).toEqual([]);
    expect(readProcess(doc()).activities.some((a) => a.sub)).toBe(false);
    expect(appStore().getState().history.undo.length).toBe(n + 2);
  });
  it('☑ Select several (a touch screen): taps add activities; any picked one\'s menu groups them; then others join that sub-process', () => {
    render(<Process />);
    const subOf = (id: string) => readProcess(doc()).activities.find((a) => a.id === id)!.sub;
    act(() => { fireEvent.click(button('☑ Select several')); });
    expect(button('☑ Select several').getAttribute('aria-pressed')).toBe('true');
    for (const id of ['A001', 'A002']) act(() => { fireEvent.click(more(id).parentElement!); });   // plain taps, no Ctrl
    expect(button('Clear selection (2)')).toBeDefined();
    act(() => { fireEvent.click(more('A002')); });   // the menu of either picked activity
    act(() => { fireEvent.click(button('📦 Create a sub-process (2 activities)')); });
    expect([subOf('A001'), subOf('A002')]).toEqual(['Sub_1', 'Sub_1']);
    const n = appStore().getState().history.undo.length;
    act(() => { fireEvent.click(button('Clear selection (2)')); });
    for (const id of ['A003', 'A001', 'A004']) act(() => { fireEvent.click(more(id).parentElement!); });
    act(() => { fireEvent.click(more('A004')); });
    act(() => { fireEvent.click(button('📦 Add 2 to Sub_1')); });
    expect([subOf('A003'), subOf('A004')]).toEqual(['Sub_1', 'Sub_1']);
    expect(appStore().getState().history.undo.length).toBe(n + 1);
    expect(readProcess(doc()).flows.filter((f) => f.container === 'L0' && !f.rework).some((f) => ['A003', 'A004'].includes(f.source))).toBe(false);
  });
});
