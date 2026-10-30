// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editorSource } from '@/controllers/processEditor';
import type { BpmnKit, BpmnModeler } from '@/controllers/processEditorKit';
import { serialize } from '@/domain/process';
import { appStore } from '@/store/instance';
import { DiagramEditor } from '@/ui/sections/scope/process/editor/DiagramEditor';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/**
 * Phase B6 (docs/SPEC_BPMN.md D-B6 b): the "Edit diagram" editor of the Process section. The kit is the REAL bpmn-js Modeler (its palette, its
 * watermark), with the two calls jsdom cannot run (SVG layout: import and the canvas viewbox) stubbed; the browser gates (tools/e2e-flows.mjs,
 * tools/a11y.mjs) open the real editor in the built file. Licence: the bpmn.io watermark is present, visible and not hidden by any style sheet.
 */
const saved = { xml: '' };
vi.mock('@/controllers/processEditorKit', async () => {
  const { default: Real } = await import('bpmn-js/lib/Modeler');
  const canvas = { zoom: () => undefined, viewbox: () => ({}) };
  class Modeler extends (Real as unknown as new (o: { container: HTMLElement }) => BpmnModeler) {
    override importXML = async () => ({ warnings: [] });
    override saveXML = async () => ({ xml: saved.xml });
    override get = (name: string): unknown => (name === 'canvas' ? canvas : super.get(name));
  }
  const kit: BpmnKit = { Modeler: Modeler as unknown as BpmnKit['Modeler'], css: '' };
  return { bpmnSource: async () => kit };
});
(globalThis as unknown as { CSS: { escape(s: string): string } }).CSS ??= { escape: (s) => s.replace(/[^\w-]/g, (c) => `\\${c}`) };

const button = (text: string): HTMLButtonElement => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent === text);
  if (!b) throw new Error(`no button ${text}`);
  return b;
};
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });
async function open(): Promise<void> {
  fireEvent.click(button('Edit diagram'));
  await flush();
}
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
beforeEach(() => { freshStore(); saved.xml = ''; });
afterEach(cleanup);

describe('Process section: the BPMN editor (B6)', { timeout: 30_000 }, () => {
  it('opens and closes from the keyboard: the button says it is expanded, the focus goes to the editor and comes back', async () => {
    const { container } = render(<DiagramEditor />), btn = button('Edit diagram');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(await axeViolations(container, { region: false })).toEqual([]);
    btn.focus();
    await open();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement?.textContent).toBe('Diagram editor');
    fireEvent.click(button('Close editor'));
    await flush();
    expect(document.querySelector('.ac-proc-editor')).toBeNull();
    expect(document.activeElement).toBe(btn);
  });
  it('licence: the bpmn.io watermark is shown in the editor, links to bpmn.io and is not hidden; no app style sheet targets it', async () => {
    render(<DiagramEditor />);
    await open();
    const logo = document.querySelector<HTMLAnchorElement>('.ac-proc-editor-canvas a.bjs-powered-by');
    expect(logo?.href).toMatch(/^https?:\/\/bpmn\.io/);
    expect(logo?.title).toBe('Powered by bpmn.io');
    expect(logo?.querySelector('svg')).not.toBeNull();
    for (let e: HTMLElement | null = logo; e; e = e.parentElement) {
      const st = getComputedStyle(e);
      expect([st.display, st.visibility, st.opacity]).not.toContain('none');
      expect(st.visibility).not.toBe('hidden');
    }
    const css = walk('src').filter((f) => /\.(css|tsx?)$/.test(f) && !f.endsWith('processEditorKit.ts')).map((f) => readFileSync(f, 'utf8'));
    expect(css.filter((t) => /bjs-powered-by|powered-by/.test(t))).toEqual([]);
  });
  it('axe: the open editor (toolbar, live region, bpmn-js palette and watermark) has no violation', async () => {
    const { container } = render(<DiagramEditor />);
    await open();
    expect(await axeViolations(container, { region: false })).toEqual([]);
  });
  it('save: no change → no step; an edit → one undoable step; Ctrl+Z on the canvas is the editor\'s, not the case\'s', async () => {
    render(<DiagramEditor />);
    await open();
    const s = appStore(), n = s.getState().history.undo.length, before = serialize(s.getState().doc.BPMN);
    saved.xml = editorSource();
    fireEvent.click(button('Save to the case'));
    await flush();
    expect(document.querySelector('.ac-proc-editor .ac-proc-live')?.textContent).toBe('No change to save.');
    expect(s.getState().history.undo.length).toBe(n);
    saved.xml = editorSource().replace('name="Source code"', 'name="Source code v2"');
    fireEvent.click(button('Save to the case'));
    await flush();
    expect(s.getState().history.undo.length).toBe(n + 1);
    expect(document.querySelector('.ac-proc-editor .ac-proc-live')?.textContent).toBe('1 activity renamed.');
    const onWindow = vi.fn();
    window.addEventListener('keydown', onWindow);
    fireEvent.keyDown(document.querySelector('.ac-proc-editor-canvas') as Element, { key: 'z', ctrlKey: true });
    window.removeEventListener('keydown', onWindow);
    expect(onWindow).not.toHaveBeenCalled();
    s.undo();
    expect(serialize(s.getState().doc.BPMN)).toBe(before);
  });
});
