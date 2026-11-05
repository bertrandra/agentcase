// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, appStore, button, canvasTestSetup, doc, fireEvent, more, Process, readProcess, render } from '../../helpers/processCanvas';

/**
 * 🧩 Process canvas tools (owner's requests 2026-11-05): Undo / Redo on the canvas, Find, Tidy layout, the keyboard (N / P / Enter), a
 * sub-process collapsed, expanded and renamed, the minimap, the view kept between visits. Box selection, the long press, the drop target and the
 * image export need a real layout (tools/e2e-bpmn-editor.mjs).
 */
canvasTestSetup();
const frame = () => document.querySelector('.ac-proc-diagram')!;
const live = () => frame().querySelector('.ac-proc-live')!.textContent!;
const inScope = (id: string) => readProcess(doc()).activities.find((a) => a.id === id)!.inScope !== false;

describe('Process canvas tools', { timeout: 90_000 }, () => {
  it('↶ Undo and ↷ Redo on the canvas move through the history', () => {
    render(<Process />);
    const was = inScope('A002');
    act(() => { fireEvent.click(more('A002')); });
    const item = [...document.querySelectorAll<HTMLButtonElement>('[role=menuitem]')].find((b) => /scope \(1 activity\)/.test(b.textContent!))!;
    act(() => { fireEvent.click(item); });
    expect(inScope('A002')).toBe(!was);
    act(() => { fireEvent.click(button('↶ Undo')); });
    expect(inScope('A002')).toBe(was);
    act(() => { fireEvent.click(button('↷ Redo')); });
    expect(inScope('A002')).toBe(!was);
  });
  it('Find selects an activity by id or name; says when none matches or it is not shown', () => {
    render(<Process />);
    const input = frame().querySelector<HTMLInputElement>('input[type=search]')!;
    const find = (q: string) => act(() => { fireEvent.change(input, { target: { value: q } }); fireEvent.submit(input.form!); });
    find('a003');
    expect(live()).toContain('A003');
    find('zzz-nothing');
    expect(frame().querySelector('.ac-proc-find [role=status]')!.textContent).toContain('No activity matches');
    act(() => { fireEvent.change(frame().querySelector<HTMLSelectElement>('select[id$="-ph"]')!, { target: { value: 'L0' } }); });
    const other = readProcess(doc()).activities.find((a) => a.phase !== 'L0' && !a.regulatory)!.id;
    find(other);
    expect(frame().querySelector('.ac-proc-find [role=status]')!.textContent).toContain('is not shown');
  });
  it('🧹 Tidy layout is one undoable step; N and P select the next and previous activity (Enter: in the browser check)', () => {
    render(<Process />);
    const n = appStore().getState().history.undo.length;
    act(() => { fireEvent.click(button('🧹 Tidy layout')); });
    expect(appStore().getState().history.undo.length).toBe(n + 1);
    const canvas = frame().querySelector('.ac-proc-canvas')!;
    act(() => { fireEvent.keyDown(canvas, { key: 'n' }); });
    const first = live();
    expect(first).toMatch(/^Selected: /);
    act(() => { fireEvent.keyDown(canvas, { key: 'n' }); });
    act(() => { fireEvent.keyDown(canvas, { key: 'p' }); });
    expect(live()).toBe(first);
  });
  it('a sub-process collapsed shows one box (its activities hidden), expanded again; renamed from its menu', () => {
    render(<Process />);
    act(() => { fireEvent.click(more('A002')); });
    act(() => { fireEvent.click(button('📦 Create a sub-process (1 activity)')); });
    act(() => { fireEvent.click(more('Sub_1')); });
    act(() => { fireEvent.click(button('▸ Collapse (one box)')); });
    expect(frame().querySelector('.ac-bpmn-sub')!.textContent).toContain('▸ 1 activity');
    expect([...frame().querySelectorAll('.ac-bpmn-more title')].some((t) => t.textContent!.startsWith('Actions on A002:'))).toBe(false);
    act(() => { fireEvent.click(more('Sub_1')); });
    act(() => { fireEvent.click(button('▾ Expand (show its activities)')); });
    expect([...frame().querySelectorAll('.ac-bpmn-more title')].some((t) => t.textContent!.startsWith('Actions on A002:'))).toBe(true);
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Drafting agent');
    act(() => { fireEvent.click(more('Sub_1')); });
    act(() => { fireEvent.click(button('✏️ Rename')); });
    expect(readProcess(doc()).subProcesses![0]!.name).toBe('Drafting agent');
    prompt.mockRestore();
  });
  it('the minimap shows the whole drawing; the display options are kept for the next visit', () => {
    const r = render(<Process />), box = (l: string) => frame().querySelector<HTMLInputElement>(`input[aria-label="${l}"]`)!;
    act(() => { fireEvent.click(box('Minimap of the whole diagram')); });
    expect(frame().querySelector('.ac-proc-minimap .is-window')).not.toBeNull();
    act(() => { fireEvent.click(box('Freeze roles on the left')); });
    r.unmount();
    render(<Process />);
    expect(box('Minimap of the whole diagram').checked).toBe(true);
    expect(box('Freeze roles on the left').checked).toBe(true);
  });
});
