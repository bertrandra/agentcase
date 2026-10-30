// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readProcess, serialize } from '@/domain/process';
import { appStore } from '@/store/instance';
import Process from '@/ui/sections/scope/process';
import { NO_FILTERS, processView } from '@/ui/sections/scope/process/view';
import { DEFAULT_CHOICES } from '@/domain/process';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/** 🧩 Process (BPMN), phase B4 (docs/SPEC_BPMN.md § 8): diagram + table alternative, filters, scope, selection, actors, import flow, axe. */
const doc = () => appStore().getState().doc.BPMN;
const act0 = (id: string) => readProcess(doc()).activities.find((a) => a.id === id);
/** Direct DOM lookups: the section holds thousands of nodes, where Testing Library's label and role queries take seconds in jsdom. */
const aria = <T extends Element = HTMLInputElement>(label: string): T => {
  const e = document.querySelector<T>(`[aria-label="${label}"]`);
  if (!e) throw new Error(`no element labelled ${label}`);
  return e;
};
const labelled = (text: string): HTMLElement => {
  const l = [...document.querySelectorAll('label')].find((x) => x.firstChild?.textContent?.trim() === text);
  const e = l && (l.htmlFor ? document.getElementById(l.htmlFor) : l.querySelector<HTMLElement>('input, select'));
  if (!e) throw new Error(`no field labelled ${text}`);
  return e;
};
const button = (text: string): HTMLButtonElement | undefined => [...document.querySelectorAll('button')].find((b) => b.textContent === text);
const has = (sel: string, text: string): boolean => [...document.querySelectorAll(sel)].some((e) => e.textContent?.includes(text));
/** A picked file (jsdom's File has no text()): what the reader uses of it. */
const file = (name: string) => {
  const text = readFileSync(`fixtures/bpmn/${name}.bpmn`, 'utf8');
  return { name: `${name.split('/').pop() ?? name}.bpmn`, size: text.length, text: async () => text };
};
async function pick(name: string): Promise<void> {
  const input = aria('BPMN file to import');
  await act(async () => { fireEvent.change(input, { target: { files: [file(name)] } }); await new Promise((r) => setTimeout(r, 30)); });
}
beforeEach(() => {
  freshStore();
  processView.setState({ selected: null, filters: NO_FILTERS, sort: { key: 'id', dir: 1 }, read: null, errors: [], choices: DEFAULT_CHOICES, report: null });
});
afterEach(cleanup);

describe('Process section', { timeout: 90_000 }, () => {
  it('draws the diagram as an image described by the table, and lists every activity in the table (100 first, then all)', () => {
    render(<Process />);
    const img = document.querySelector('svg[role=img]')!;
    expect(document.getElementById(img.getAttribute('aria-labelledby')!)?.textContent).toBe('Diagram of the delivery process');
    expect(img.querySelectorAll('.ac-bpmn-activity')).toHaveLength(readProcess(doc()).activities.length);
    expect(img.getAttribute('aria-describedby')).toContain([...document.querySelectorAll('h2')].find((h) => h.textContent === 'Activities')!.id);
    const n = readProcess(doc()).activities.length;
    expect(document.querySelectorAll('.ac-proc-table tbody tr')).toHaveLength(100);   // a long list: the first 100, then "Show all"
    fireEvent.click(button(`Show all ${n}`)!);
    expect(document.querySelectorAll('.ac-proc-table tbody tr')).toHaveLength(n);
  });
  it('filters and sorts; the scope box is one undoable process.setScope step; selecting an id announces it and opens its panel', () => {
    render(<Process />);
    fireEvent.change(labelled('Phase'), { target: { value: 'V3' } });
    expect(document.querySelectorAll('.ac-proc-table tbody tr').length).toBe(readProcess(doc()).activities.filter((a) => a.phase === 'V3').length);
    const effort = [...document.querySelectorAll<HTMLButtonElement>('.ac-proc-sort')].find((b) => b.textContent === 'Effort')!;
    fireEvent.click(effort);
    expect(effort.closest('th')!.getAttribute('aria-sort')).toBe('ascending');
    const was = act0('A017')?.inScope;
    fireEvent.click(aria('A017 Source code in scope'));
    expect(act0('A017')?.inScope).toBe(!was);
    expect(appStore().getState().history.undo.at(-1)?.type).toBe('process.setScope');
    fireEvent.click(aria('Select A017 Source code'));
    expect(has('.ac-proc-live', 'Selected: A017 Source code')).toBe(true);
    fireEvent.change(labelled('Effort'), { target: { value: '7' } });
    expect(act0('A017')?.effort).toBe(7);
  });
  it('zooms with the keyboard on the diagram frame', () => {
    render(<Process />);
    const frame = document.querySelector<HTMLElement>('.ac-proc-canvas')!, svg = frame.querySelector('svg')!;
    const before = svg.getAttribute('viewBox');
    fireEvent.keyDown(frame, { key: '+' });
    expect(svg.getAttribute('viewBox')).not.toBe(before);
    fireEvent.keyDown(frame, { key: '0' });
    expect(svg.getAttribute('viewBox')).toBe(before);
  });
  it('imports a foreign file: preview, mapping required, one undoable step, report; undo restores the exact document', async () => {
    render(<Process />);
    const before = serialize(doc());
    await pick('foreign-camunda8-zeebe');
    expect(has('h2', 'Import foreign-camunda8-zeebe.bpmn')).toBe(true);
    const go = button('Import')!;
    expect(go.disabled).toBe(true);   // Hypercare and QA Engineers are not mapped yet
    fireEvent.change(aria('Phase for Hypercare'), { target: { value: 'L9' } });
    fireEvent.change(aria('Team skill for QA Engineers'), { target: { value: 'Test/QA' } });
    expect(go.disabled).toBe(false);
    fireEvent.click(go);
    expect(has('h2', 'Import report (merge)')).toBe(true);
    expect(act0('Activity_monitor')).toMatchObject({ phase: 'L9', name: 'Monitor error rates' });
    expect(readProcess(doc()).actors.find((a) => a.name === 'QA Engineers')?.teamSkill).toBe('Test/QA');
    expect(appStore().getState().history.undo.at(-1)?.type).toBe('process.import');
    act(() => { appStore().undo(); });
    expect(serialize(doc())).toBe(before);
  });
  it('refuses a hostile file before anything is written', async () => {
    render(<Process />);
    const before = doc();
    await pick('hostile/xxe-external-entity');
    expect(processView.getState().errors.length).toBeGreaterThan(0);
    expect(button('Import')).toBeUndefined();
    expect(doc()).toBe(before);
  });
  it('is axe clean, with an import preview open', async () => {
    const { container } = render(<Process />);
    await pick('foreign-signavio');
    fireEvent.click(aria('Select A017 Source code'));
    expect(await axeViolations(container, { region: false })).toEqual([]);
  });
});
