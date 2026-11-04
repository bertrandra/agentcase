import { describe, expect, it } from 'vitest';
import { addLink, addToSubProcess, createSubProcess, deleteSubProcess, drawingOf, fitSubs, leaveSubProcess, readProcess, subRefusal,
  type XDocument } from '@/domain/process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeCtx } from '@/domain';
import { headline } from '@/domain/economics/headline';
import { serialize } from '@/domain/process/xmlWrite';
import { schemaTestsRun, validate } from '../../helpers/bpmnValidate';
import { opened, withDoc } from '../../helpers/processCases';

/**
 * Sub-processes on the canvas (owner's request 2026-11-04): activities of a phase grouped in a BPMN sub-process, their links inherited by it,
 * given back when it is deleted; the activities keep their phase and parameters, so no figure moves.
 */
const golden = (): XDocument => opened('golden').BPMN as never;
const plain = (d: XDocument) => readProcess(d).flows.filter((f) => !f.rework).map((f) => `${f.container}:${f.source}>${f.target}`);
const acts = (d: XDocument) => readProcess(d).activities.map((a) => ({ ...a, sub: undefined }));

describe('sub-processes', () => {
  it('create: the activities in the sub-process (same phase, same parameters), the flow between them inside, the links from outside inherited', () => {
    const d = golden(), out = createSubProcess(d, ['A002', 'A003']), v = readProcess(out);
    expect(v.subProcesses).toEqual([{ id: 'Sub_1', name: 'Sub-process 1', phase: 'L0' }]);
    expect(v.activities.filter((a) => a.sub === 'Sub_1').map((a) => a.id)).toEqual(['A002', 'A003']);
    expect(acts(out).sort((a, b) => a.id.localeCompare(b.id))).toEqual(acts(d).sort((a, b) => a.id.localeCompare(b.id)));
    const f = plain(out);
    expect(f).toContain('Sub_1:A002>A003');
    expect(f).toContain('L0:A001>Sub_1');
    expect(f).toContain('L0:Sub_1>A004');
    expect(f.some((x) => x.includes('A001>A002') || x.includes('A003>A004'))).toBe(false);
    const sub = drawingOf(out).shapes.find((s) => s.id === 'Sub_1')!, a2 = drawingOf(out).shapes.find((s) => s.id === 'A002')!;
    expect(sub.kind).toBe('sub');
    expect(a2.sub).toBe('Sub_1');
    expect(a2.x >= sub.x && a2.x + a2.w <= sub.x + sub.w && a2.y >= sub.y && a2.y + a2.h <= sub.y + sub.h).toBe(true);
  });
  it('delete: the activities and their flow back in the phase, the inherited links given back to the first and last activities', () => {
    const d = golden(), out = deleteSubProcess(createSubProcess(d, ['A002', 'A003']), 'Sub_1'), v = readProcess(out);
    expect(v.subProcesses).toBeUndefined();
    expect(v.activities.some((a) => a.sub)).toBe(false);
    expect(plain(out).filter((x) => x.startsWith('L0:')).sort()).toEqual(plain(d).filter((x) => x.startsWith('L0:')).sort());
    expect(drawingOf(out).shapes.some((s) => s.id === 'Sub_1')).toBe(false);
  });
  it('add and leave: an activity dropped in joins it (its links inherited); one taken out leaves it; the last one out deletes it', () => {
    const one = createSubProcess(golden(), ['A002']), two = addToSubProcess(one, 'Sub_1', 'A003');
    expect(readProcess(two).activities.find((a) => a.id === 'A003')!.sub).toBe('Sub_1');
    expect(plain(two)).toContain('Sub_1:A002>A003');
    expect(plain(two)).toContain('L0:Sub_1>A004');
    const back = leaveSubProcess(two, 'Sub_1', ['A003']);
    expect(readProcess(back).activities.find((a) => a.id === 'A003')!.sub).toBeUndefined();
    expect(plain(back)).toContain('L0:Sub_1>A003');
    expect(readProcess(leaveSubProcess(back, 'Sub_1', ['A002'])).subProcesses).toBeUndefined();
  });
  it('refused: activities of two phases, an activity already in one, an empty selection', () => {
    const d = golden(), other = readProcess(d).activities.find((a) => a.phase !== 'L0' && !a.regulatory)!.id;
    expect(subRefusal(d, ['A001', other])).toMatch(/one phase/);
    expect(createSubProcess(d, ['A001', other])).toBe(d);
    expect(subRefusal(createSubProcess(d, ['A002']), ['A002'])).toMatch(/already/);
    expect(subRefusal(d, [])).toMatch(/groups activities/);
  });
  it('a link to an activity of a sub-process goes to the sub-process; inside, between its activities', () => {
    const d = createSubProcess(golden(), ['A002', 'A003']);
    expect(plain(addLink(d, 'A004', 'A002'))).toContain('L0:A004>Sub_1');
    expect(plain(addLink(d, 'A003', 'A002'))).toContain('Sub_1:A003>A002');
  });
  it('a view redraws the sub-process box around the activities it shows', () => {
    const d = drawingOf(createSubProcess(golden(), ['A002', 'A003']));
    const moved = { ...d, shapes: d.shapes.map((s) => (s.id === 'A003' ? { ...s, y: s.y + 500 } : s)) };
    const f = fitSubs(moved), sub = f.shapes.find((s) => s.id === 'Sub_1')!, a3 = f.shapes.find((s) => s.id === 'A003')!;
    expect(a3.y + a3.h <= sub.y + sub.h).toBe(true);
    expect(fitSubs({ ...d, shapes: d.shapes.filter((s) => s.id !== 'A002' && s.id !== 'A003') }).shapes.some((s) => s.id === 'Sub_1')).toBe(false);
  });
  it('no figure moves: the headline of the case is the same with the sub-process', () => {
    const s = opened('golden'), sub = withDoc(s, createSubProcess(s.BPMN, ['A002', 'A003']));
    expect(headline(makeCtx(sub))).toEqual(headline(makeCtx(s)));
  });
  it.skipIf(!schemaTestsRun())('the document with a sub-process validates (OMG XSDs + ac: + profile)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bpmn-sub-')), f = join(dir, 'sub.bpmn');
    writeFileSync(f, serialize(addLink(createSubProcess(golden(), ['A002', 'A003']), 'A004', 'A002')));
    const r = validate([f]).results[0]!;
    rmSync(dir, { recursive: true, force: true });
    expect({ schema: r.schema, errors: r.errors }).toEqual({ schema: 'valid', errors: [] });
  });
  it('its activities are laid out together: the box holds them only, each in its lane, inside its phase, no overlap', () => {
    const d0 = golden(), d = addToSubProcess(createSubProcess(d0, ['A002', 'A003']), 'Sub_1', 'A004'), sh = drawingOf(d).shapes;
    const sub = sh.find((s) => s.id === 'Sub_1')!, phase = sh.find((s) => s.id === 'L0')!, inside = (a: { x: number; y: number; w: number; h: number },
      c: { x: number; y: number; w: number; h: number }) => a.x >= c.x && a.x + a.w <= c.x + c.w && a.y >= c.y && a.y + a.h <= c.y + c.h;
    const acts = sh.filter((s) => s.kind === 'activity'), mine = acts.filter((s) => s.sub === 'Sub_1');
    expect(mine.map((s) => s.id).sort()).toEqual(['A002', 'A003', 'A004']);
    for (const a of acts) expect(inside(a, sub)).toBe(a.sub === 'Sub_1');
    for (const a of mine) {
      expect(inside(a, phase)).toBe(true);
      expect(a.y).toBe(drawingOf(d0).shapes.find((s) => s.id === a.id)!.y);   // its lane (its row) kept
    }
    for (const a of acts) for (const b of acts) if (a !== b) expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
  });
});
