import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addActivity, drawingOf, moveActivity, readProcess, resetProcess, serialize, setDiagram, setReworkFlow, updateActivity, viewsOf,
  type XDocument } from '@/domain/process';
import { makeDefaultDoc } from '@/store/instance';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { CUSTOM } from '../../store/samples/process';
import { schemaTestsRun, validate } from '../../helpers/bpmnValidate';

/**
 * The phase B4 process edits (docs/SPEC_BPMN.md § 9): moveActivity, setReworkFlow, setDiagram, reset (F-B19), and the drawing of the Process
 * section (F-B13: an activity without a shape is placed without moving the others). Each keeps the tree in the reader's form and the profile valid.
 */
const base = (): XDocument => makeDefaultDoc().BPMN;
const act = (d: XDocument, id: string) => readProcess(d).activities.find((a) => a.id === id);
const canonical = (d: XDocument): void => { const r = parseBpmn(serialize(d)); expect(r.errors).toEqual([]); expect(r.doc).toStrictEqual(d); };

describe('process.moveActivity', () => {
  it('moves the task and its deliverable to the end of the other phase; its shape goes (the layout places it); refused for a rework pair', () => {
    const d0 = base(), d = moveActivity(d0, 'A019', 'V4');
    expect(act(d, 'A019')).toMatchObject({ phase: 'V4', deliverable: act(d0, 'A019')?.deliverable });
    expect(readProcess(d).activities.filter((a) => a.phase === 'V4').at(-1)?.id).toBe('A019');
    expect(readProcess(d).diagram.shapes.some((s) => s.element === 'A019')).toBe(false);
    expect(drawingOf(d).shapes.find((s) => s.id === 'A019')).toMatchObject({ placed: true, phase: 'V4' });
    expect(viewsOf(d).sdlc.find((a) => a.id === 'A019')?.phase).toBe('V4');
    expect(moveActivity(d0, 'A017', 'V4')).toBe(d0);   // A017 is in the loops LP001 / LP002
    expect(moveActivity(d0, 'A019', 'V3')).toBe(d0);
    expect(moveActivity(d0, 'A019', 'Z9')).toBe(d0);
    canonical(d);
  });
});

describe('process.setReworkFlow / setDiagram', () => {
  it('sets the parameters of a rework flow; refuses a flow without rework and values out of range', () => {
    const d0 = base(), d = setReworkFlow(d0, 'LP001', { probability: 0.25, costShare: 0.5, internalIterations: 4 });
    expect(readProcess(d).flows.find((f) => f.id === 'LP001')?.rework).toMatchObject({ probability: 0.25, costShare: 0.5, internalIterations: 4 });
    expect(viewsOf(d).loopPairs.find((l) => l.id === 'LP001')).toMatchObject({ extReworkPct: 0.25, extCostShare: 0.5, internalIter: 4 });
    expect(setReworkFlow(d0, 'LP001', { probability: 1.5 })).toBe(d0);
    expect(setReworkFlow(d0, 'Flow_Start_Fork', { probability: 0.1 })).toBe(d0);
    canonical(d);
  });
  it('moves a shape in place, adds a shape for an element without one at the end of the plane, refuses bad bounds', () => {
    const d0 = base(), d = setDiagram(d0, 'A017', { x: 1, y: 2, w: 100, h: 80 });
    expect(readProcess(d).diagram.shapes.find((s) => s.element === 'A017')).toMatchObject({ x: 1, y: 2, w: 100, h: 80 });
    expect(setDiagram(d, 'A017', { x: 1, y: 2, w: 100, h: 80 })).toBe(d);
    const c = addActivity(d0, CUSTOM);
    expect(drawingOf(c).shapes.find((s) => s.id === 'X100')?.placed).toBe(true);
    const placed = setDiagram(c, 'X100', { x: 500, y: 600, w: 100, h: 80 });
    expect(drawingOf(placed).shapes.find((s) => s.id === 'X100')).toMatchObject({ x: 500, y: 600 });
    expect(drawingOf(placed).shapes.find((s) => s.id === 'X100')?.placed).toBeUndefined();
    expect(setDiagram(d0, 'A017', { x: 0, y: 0, w: 0, h: 10 })).toBe(d0);
    expect(setDiagram(d0, 'NOPE', { x: 0, y: 0, w: 10, h: 10 })).toBe(d0);
    canonical(placed);
  });
  it('the drawing keeps every shape of the diagram where it is and types it', () => {
    const d = drawingOf(base()), shapes = readProcess(base()).diagram.shapes;
    expect(d.shapes).toHaveLength(shapes.length);
    expect(d.shapes.filter((s) => s.kind === 'activity')).toHaveLength(readProcess(base()).activities.length);
    expect(d.shapes.filter((s) => s.kind === 'phase')).toHaveLength(12);
    expect(d.edges.filter((e) => e.rework).length).toBeGreaterThan(0);
  });
});

describe('process.reset (F-B19)', () => {
  it('a phase reset restores its catalogue activities and parameters, drops the added ones, brings back a moved one, keeps the rest', () => {
    const d0 = base();
    let d = updateActivity(addActivity(moveActivity(d0, 'A019', 'V4'), { ...CUSTOM, phase: 'V3' }), 'A018', { effort: 42 });
    d = updateActivity(d, 'A001', { effort: 9 });
    const r = resetProcess(d, d0, 'V3');
    expect(act(r, 'A019')?.phase).toBe('V3');
    expect(act(r, 'X100')).toBeUndefined();
    expect(readProcess(r).activities.filter((a) => a.id === 'A019')).toHaveLength(1);
    expect(act(r, 'A018')?.effort).toBe(act(d0, 'A018')?.effort);
    expect(act(r, 'A001')?.effort).toBe(9);   // another phase: untouched
    expect(resetProcess(r, d0, 'V4')).not.toBe(r);
    expect(serialize(resetProcess(resetProcess(r, d0, 'V4'), d0, 'L0'))).not.toBe('');
    expect(resetProcess(d, d0)).toBe(d0);
    expect(resetProcess(d0, d0, 'V3')).toBe(d0);
    expect(resetProcess(d, d0, 'Z9')).toBe(d);
    canonical(r);
  });
  it.runIf(schemaTestsRun())('the edited documents stay valid (OMG XSDs + ac: + profile)', () => {
    const d0 = base();
    let d = setReworkFlow(moveActivity(addActivity(d0, CUSTOM), 'A019', 'V4'), 'LP003', { costShare: 0.3 });
    d = resetProcess(setDiagram(d, 'X100', { x: 10, y: 10, w: 100, h: 80 }), d0, 'V3');
    const dir = mkdtempSync(join(tmpdir(), 'ac-b4-')), file = join(dir, 'edited.bpmn');
    writeFileSync(file, serialize(d));
    const r = validate([file]).results[0];
    rmSync(dir, { recursive: true, force: true });
    expect(r?.errors).toEqual([]);
    expect(r).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
  }, 60_000);
});
