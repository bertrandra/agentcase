// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, appStore, button, canvasTestSetup, doc, fireEvent, more, Process, readProcess, render } from '../../helpers/processCanvas';

/**
 * 🧩 Process diagram canvas, the selection (owner's requests 2026-11-05): Select several (taps, no Ctrl), the menu acting on the selection
 * (sub-process, scope), how many activities each action acts on. The other canvas edits: process-canvas-edit.test.tsx.
 */
canvasTestSetup();

describe('Process diagram canvas selection', { timeout: 90_000 }, () => {
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
    act(() => { fireEvent.click(button('📦 Add to Sub_1 (2 activities)')); });
    expect([subOf('A003'), subOf('A004')]).toEqual(['Sub_1', 'Sub_1']);
    expect(appStore().getState().history.undo.length).toBe(n + 1);
    expect(readProcess(doc()).flows.filter((f) => f.container === 'L0' && !f.rework).some((f) => ['A003', 'A004'].includes(f.source))).toBe(false);
  });
  it('the menu toggles the scope of the activity or of the selection, one step each', () => {
    render(<Process />);
    const inScope = (id: string) => readProcess(doc()).activities.find((a) => a.id === id)!.inScope !== false, was = inScope('A002');
    const n = appStore().getState().history.undo.length;
    act(() => { fireEvent.click(more('A002')); });
    act(() => { fireEvent.click(button(was ? '⊘ Set out of scope (1 activity)' : '✅ Set in scope (1 activity)')); });
    expect(inScope('A002')).toBe(!was);
    expect(appStore().getState().history.undo.length).toBe(n + 1);
    act(() => { fireEvent.click(button('☑ Select several')); });
    for (const id of ['A001', 'A002']) act(() => { fireEvent.click(more(id).parentElement!); });
    act(() => { fireEvent.click(more('A001')); });
    const label = [...document.querySelectorAll('[role=menuitem]')].map((b) => b.textContent!).find((t) => /scope \(2 activities\)/.test(t))!;
    act(() => { fireEvent.click(button(label)); });
    const on = label.startsWith('✅');
    expect([inScope('A001'), inScope('A002')]).toEqual([on, on]);
  });
  it('every selection action says how many activities it acts on, one included', () => {
    render(<Process />);
    act(() => { fireEvent.click(more('A001')); });
    const items = [...document.querySelectorAll('[role=menuitem]')].map((b) => b.textContent!);
    expect(items).toContain('📦 Create a sub-process (1 activity)');
    expect(items.some((t) => /scope \(1 activity\)$/.test(t))).toBe(true);
  });
});
