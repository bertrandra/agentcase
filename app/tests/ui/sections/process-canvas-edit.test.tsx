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
});
