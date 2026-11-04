// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appStore } from '@/store/instance';
import Process from '@/ui/sections/scope/process';
import { resetProcessView } from '@/ui/sections/scope/process/view';
import { freshStore } from '../../store/helpers';

/**
 * 🧩 Process diagram display options (owner's requests 2026-11-03): full screen (the editor's is checked in the browser, tools/e2e-bpmn-editor.mjs)
 * and the compact layout when the out-of-scope activities are hidden.
 */
/** The button whose text (visible words and screen-reader words) is `label`. */
const byLabel = (label: string): HTMLButtonElement => [...document.querySelectorAll('button')].find((b) => b.textContent!.replace(/^[⤢⤡] /, '') === label)!;
beforeEach(() => { freshStore(); resetProcessView(); });
afterEach(cleanup);

describe('Process diagram full screen', { timeout: 90_000 }, () => {
  it('fills the window; Escape or the button leaves it; view state only (no undo step)', () => {
    render(<Process />);
    const n = appStore().getState().history.undo.length, frame = () => document.querySelector<HTMLElement>('.ac-proc-diagram')!;
    act(() => { fireEvent.click(byLabel('Full screen: Process diagram')); });
    expect(frame().classList.contains('ac-fullscreen')).toBe(true);
    expect(byLabel('Exit full screen: Process diagram').getAttribute('aria-pressed')).toBe('true');
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(frame().classList.contains('ac-fullscreen')).toBe(false);
    act(() => { fireEvent.click(byLabel('Full screen: Process diagram')); });
    act(() => { fireEvent.click(byLabel('Exit full screen: Process diagram')); });
    expect(frame().classList.contains('ac-fullscreen')).toBe(false);
    expect(appStore().getState().history.undo.length).toBe(n);
  });
  it('hiding the out-of-scope activities compacts the layout (a smaller picture); "Compact the layout" off keeps the full grid', () => {
    render(<Process />);
    const n = appStore().getState().history.undo.length, frame = document.querySelector('.ac-proc-diagram')!;
    const box = (name: string) => frame.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`)!;
    const area = () => { const v = frame.querySelector('.ac-proc-canvas svg')!.getAttribute('viewBox')!.split(' ').map(Number); return v[2]! * v[3]!; };
    const full = area();
    expect(box('Compact the layout').disabled).toBe(true);
    act(() => { fireEvent.click(box('Hide out-of-scope activities')); });
    expect(box('Compact the layout').checked).toBe(true);
    const compact = area();
    expect(compact).toBeLessThan(full / 2);
    act(() => { fireEvent.click(box('Compact the layout')); });
    expect(area()).toBeCloseTo(full, 0);
    expect(appStore().getState().history.undo.length).toBe(n);
  });
});
