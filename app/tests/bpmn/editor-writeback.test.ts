import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyEditorDocument, kid, NS, readProcess, serialize, type XDocument } from '@/domain/process';
import { legacyProcess } from '@/store/persistence/bpmn/caseDoc';
import { drawTask, drop, editorSave, list, planeOf, type Edit } from '../helpers/editorModdle';
import { parsed } from '../helpers/bpmnRoundTrip';
import { schemaTestsRun, validateText } from '../helpers/bpmnValidate';

/**
 * Phase B6 (docs/SPEC_BPMN.md D-B6 b): the BPMN editor's save merged back into the case's document. The editor's serialiser is bpmn-moddle (what
 * bpmn-js's `saveXML` runs), so an open → save without a change, and each kind of canvas edit, are replayed here on the real serialiser.
 */
const CASE = legacyProcess({}), TEXT = serialize(CASE);
const save = async (edit?: (e: Edit) => void, text = TEXT, cur: XDocument = CASE) => {
  const r = await editorSave(text, edit);
  // bpmn-moddle cannot resolve the `definition` QName of the profile's `bpmn:extension` (it drops it from its text; the merge keeps it)
  expect(r.warnings.map((w) => (w as { message: string }).message).filter((m) => m !== 'unresolved reference <ac:process>')).toEqual([]);
  return applyEditorDocument(cur, parsed(r.xml));
};
const act = (d: XDocument, id: string) => readProcess(d).activities.find((a) => a.id === id);
const SAMPLES = readdirSync('fixtures/bpmn').filter((f) => f.endsWith('.bpmn')).sort();

describe('B6 editor write-back', { timeout: 30_000 }, () => {
  it('open → save without a change gives the SAME document (no command, byte-identical) on the case', async () => {
    const o = await save();
    expect(o.doc).toBe(CASE);
    expect(o.refused).toEqual([]);
  });
  it.each(SAMPLES)('open → save without a change keeps %s byte-identical (comments, prefixes and vendor extensions included)', async (f) => {
    const text = readFileSync(`fixtures/bpmn/${f}`, 'utf8'), d = parsed(text), o = await save(undefined, text, d);
    expect(o.doc).toBe(d);
    expect(serialize(o.doc)).toBe(serialize(d));
  });
  it('moving a shape changes its bounds only: every other node is the same object', async () => {
    const o = await save((e) => { ((e.byId.A017_di as unknown as { bounds: { x: number } }).bounds).x += 40; });
    expect(o.doc).not.toBe(CASE);
    const proc = (d: XDocument) => kid(d.root, NS.bpmn, 'process');
    expect(proc(o.doc)).toBe(proc(CASE));
    const a = serialize(o.doc).split('\n'), b = TEXT.split('\n');
    expect(a.length).toBe(b.length);
    expect(a.filter((l, i) => l !== b[i])).toHaveLength(1);
  });
  it('a rename is the name attribute of that activity', async () => {
    const o = await save((e) => { (e.byId.A017 as { name: string }).name = 'Source code (edited)'; });
    expect(o.renamed).toEqual(['A017']);
    expect(act(o.doc, 'A017')?.name).toBe('Source code (edited)');
    expect({ ...act(o.doc, 'A017'), name: '' }).toEqual({ ...act(CASE, 'A017'), name: '' });
  });
  it('a task drawn in a phase becomes an activity with the parameters of its phase (F-B8 defaults), in scope', async () => {
    const o = await save((e) => { drawTask(e, 'V3', 'Activity_0new', 'Pair review'); });
    expect(o.added).toEqual(['Activity_0new']);
    const a = act(o.doc, 'Activity_0new');
    expect(a).toMatchObject({ phase: 'V3', name: 'Pair review', inScope: true, type: 'Human' });
    expect(a?.effort).toBeGreaterThan(0);
    expect(a?.humanPerformer).toBeTruthy();
    expect(parsed(serialize(o.doc)).root).toEqual(o.doc.root);
  });
  it('an element AgentCase does not model is kept as pass-through and reported; the activities do not change', async () => {
    const o = await save((e) => {
      const ev = e.moddle.create('bpmn:IntermediateThrowEvent', { id: 'Event_0x', name: 'Milestone' });
      ev.$parent = e.byId.V2;
      list(e.byId.V2, 'flowElements').push(ev);
    });
    expect(o.passThrough).toEqual({ intermediateThrowEvent: 1 });
    expect(readProcess(o.doc).activities).toEqual(readProcess(CASE).activities);
    expect(serialize(o.doc)).toContain('<bpmn:intermediateThrowEvent id="Event_0x" name="Milestone"/>');
  });
  it('a task removed on the canvas goes with its shape and its deliverable; a task of a rework pair is refused', async () => {
    const remove = (id: string) => (e: Edit) => {
      const t = e.byId[id];
      drop(t?.$parent, 'flowElements', t);
      drop(planeOf(e.defs), 'planeElement', e.byId[`${id}_di`]);
    };
    const o = await save(remove('A019'));
    expect(o.removed).toEqual(['A019']);
    expect(serialize(o.doc)).not.toContain('A019');
    const pair = await save(remove('A017'));
    expect(pair.doc).toBe(CASE);
    expect(pair.refused).toEqual(['Activity A017 belongs to a rework pair: remove it from the activity table.']);
  });
  it('a task dragged into another phase takes the phase and its deliverable along', async () => {
    const o = await save((e) => {
      const t = e.byId.A019;
      drop(t?.$parent, 'flowElements', t);
      list(e.byId.V2, 'flowElements').push(t as never);
    });
    expect(o.moved).toEqual(['A019']);
    expect(act(o.doc, 'A019')?.phase).toBe('V2');
    expect(act(o.doc, 'A019')?.deliverable).toBe(act(CASE, 'A019')?.deliverable);
  });
  it.runIf(schemaTestsRun())('the merged document of several edits validates against the OMG and AgentCase XSDs', async () => {
    const o = await save((e) => {
      drawTask(e, 'V3', 'Activity_0new', 'Pair review', 'bpmn:ServiceTask');
      const t = e.byId.A019;
      drop(t?.$parent, 'flowElements', t);
      list(e.byId.V2, 'flowElements').push(t as never);
    });
    expect(o.added).toEqual(['Activity_0new']);
    expect(validateText(serialize(o.doc))?.errors).toEqual([]);
  });
  it('structure AgentCase owns is refused with a message, and nothing changes', async () => {
    const pool = await save((e) => {
      const c = e.moddle.create('bpmn:Collaboration', { id: 'Collab_1' });
      list(e.defs, 'rootElements').unshift(c);
    });
    expect(pool.doc).toBe(CASE);
    expect(pool.refused[0]).toMatch(/Pools and processes/);
    const phase = await save((e) => { drop(e.byId.Process, 'flowElements', e.byId.V7); });
    expect(phase.doc).toBe(CASE);
    expect(phase.refused.join()).toMatch(/Phase V7 .* cannot be removed/);
  });
});
