// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { drawingOf, readProcess } from '@/domain/process';
import { editAudit } from '@/controllers/audit';
import { auditProgressOf } from '@/domain/audit';
import { appStore } from '@/store/instance';
import Process from '@/ui/sections/scope/process';
import { resetProcessView, setFilter } from '@/ui/sections/scope/process/view';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';
import '../../helpers/pointerShim';   // jsdom has no PointerEvent

/**
 * 🧩 Process diagram display options: pinch zoom, the table's filters on the diagram, zoom to a selection of several activities (Ctrl / Shift +
 * click) at a readable zoom, hide the activities out of scope, colours by task type or AI authority with a legend. View state only: no step in
 * the undo history, the document untouched.
 */
const doc = () => appStore().getState().doc.BPMN;
const svg = () => document.querySelector<SVGSVGElement>('.ac-proc-canvas svg')!;
const frame = () => document.querySelector<HTMLElement>('.ac-proc-canvas')!;
const shapes = () => [...svg().querySelectorAll<SVGGElement>('g.ac-bpmn-activity')];
const ids = () => drawingOf(doc()).shapes.filter((s) => s.kind === 'activity').map((s) => s.id);
const shapeOf = (id: string) => shapes()[ids().indexOf(id)]!;
const checkbox = (text: string) => [...document.querySelectorAll('label')].find((l) => l.textContent?.includes(text))!.querySelector('input')!;
const button = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === text)!;
const colours = () => [...document.querySelectorAll('label')].find((l) => l.textContent === 'Colours')!;
const scale = () => 1000 / parseFloat(svg().getAttribute('viewBox')!.split(' ')[2]!);

beforeEach(() => {
  freshStore();
  resetProcessView();
});
afterEach(cleanup);

describe('Process diagram display options', { timeout: 90_000 }, () => {
  it('zooms with two fingers (a pinch), then fits again with 0', () => {
    render(<Process />);
    const f = frame(), vb = () => svg().getAttribute('viewBox'), before = vb(), w0 = parseFloat(before!.split(' ')[2]!);
    const at = (pointerId: number, x: number) => ({ pointerId, clientX: x, clientY: 100, pointerType: 'touch', buttons: 1 });
    fireEvent.pointerDown(f, at(1, 100)); fireEvent.pointerDown(f, at(2, 200));
    fireEvent.pointerMove(f, at(2, 500));   // fingers 100 → 400 apart: 4 ×
    expect(parseFloat(vb()!.split(' ')[2]!)).toBeCloseTo(w0 / 4, 6);
    fireEvent.pointerUp(f, at(2, 500)); fireEvent.pointerUp(f, at(1, 100));
    fireEvent.keyDown(f, { key: '0' });
    expect(vb()).toBe(before);
  });
  it('fades the activities the table filters leave out; "Zoom to filtered" fits them at a readable zoom', () => {
    render(<Process />);
    expect(button('Zoom to selection').disabled).toBe(true);
    act(() => setFilter('phase', 'V3'));
    const v3 = new Set(readProcess(doc()).activities.filter((a) => a.phase === 'V3').map((a) => a.id));
    ids().forEach((id) => expect(shapeOf(id).classList.contains('is-faded')).toBe(!v3.has(id)));
    fireEvent.click(button('Zoom to filtered'));
    expect(scale()).toBeGreaterThanOrEqual(2 * (1000 / drawingOf(doc()).box.w) - 1e-9);
  });
  it('Ctrl / Shift + click picks several activities; "Zoom to selection" centres them, labels readable', () => {
    render(<Process />);
    const [a, b] = ids();
    fireEvent.click(shapeOf(a!));
    fireEvent.click(shapeOf(b!), { ctrlKey: true });
    expect(shapeOf(a!).classList.contains('is-picked')).toBe(true);
    expect(shapeOf(b!).classList.contains('is-selected')).toBe(true);
    expect(document.querySelector('.ac-proc-live')!.textContent).toContain('(+1 more)');
    fireEvent.click(button('Zoom to selection'));
    expect(svg().querySelector('.ac-bpmn-id')).not.toBeNull();   // labels are drawn from the readable zoom on
    fireEvent.click(shapeOf(b!));   // a plain click selects one again
    expect(shapes().filter((g) => g.classList.contains('is-picked'))).toHaveLength(0);
    expect(appStore().getState().history.undo).toHaveLength(0);
  });
  it('hides the activities out of scope, and colours by task type or AI authority with a legend', async () => {
    const out = readProcess(doc()).activities.filter((x) => x.inScope === false).length, all = ids().length;
    render(<Process />);
    fireEvent.click(checkbox('Hide out-of-scope activities'));
    expect(shapes()).toHaveLength(all - out);
    fireEvent.click(checkbox('Hide out-of-scope activities'));
    expect(shapes()).toHaveLength(all);
    const sel = document.getElementById(colours().htmlFor) as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'type' } });
    const manual = readProcess(doc()).activities.find((x) => x.type === 'Manual')!;
    expect(shapeOf(manual.id).getAttribute('class')).toContain('ac-bpmn-cat-2');   // Manual: the 2nd task type, the 2nd chart colour
    expect([...document.querySelectorAll('.ac-proc-legend li')].map((l) => l.textContent)).toContain('Manual');
    fireEvent.change(sel, { target: { value: 'authority' } });
    expect(document.querySelector('.ac-proc-legend')!.getAttribute('aria-label')).toBe('Colours by AI authority');
    expect(doc()).toBe(appStore().getState().doc.BPMN);
    expect(await axeViolations(document.querySelector('.ac-proc-diagram')!)).toEqual([]);
  });
  it('colours by audit progress: planned, in progress, audited (data, no status), closed; not audited stays uncoloured', () => {
    expect([auditProgressOf({ audited: false }), auditProgressOf({ audited: false, status: 'planned' }), auditProgressOf({ audited: true }),
      auditProgressOf({ audited: true, status: 'planned' }), auditProgressOf({ audited: false, status: 'inProgress' }),
      auditProgressOf({ audited: true, status: 'closed' })]).toEqual(['Not audited', 'Planned', 'Audited', 'Audited', 'In progress', 'Closed']);
    const [a, b, c, d, e] = ids();
    editAudit(a!, { kind: 'status', status: 'planned' });
    editAudit(b!, { kind: 'status', status: 'inProgress' });
    editAudit(c!, { kind: 'painPoint', point: { text: 'Specs arrive late', severity: 3, aiCandidate: 'yes' } });
    editAudit(d!, { kind: 'status', status: 'closed' });
    render(<Process />);
    const sel = document.getElementById(colours().htmlFor) as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'audit' } });
    const cat = (id: string) => /ac-bpmn-cat-(\d)/.exec(shapeOf(id).getAttribute('class') ?? '')?.[1] ?? '';
    expect([a, b, c, d, e].map((id) => cat(id!))).toEqual(['1', '2', '3', '4', '']);
    expect(document.querySelector('.ac-proc-legend')!.getAttribute('aria-label')).toBe('Colours by audit progress');
    expect(new Set([...document.querySelectorAll('.ac-proc-legend li')].map((l) => l.textContent)))
      .toEqual(new Set(['Not audited', 'Planned', 'In progress', 'Audited', 'Closed']));
  });
});
