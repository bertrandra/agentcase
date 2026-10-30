import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addActivity, addActor, addPhase, readProcess, removeActivity, removeActor, removePhase, reorderPhases, serialize, setScope, updateActivity,
  updateActor, viewsOf, type XDocument } from '@/domain/process';
import { makeDefaultDoc } from '@/store/instance';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { CUSTOM } from '../../store/samples/process';
import { schemaTestsRun, validate } from '../../helpers/bpmnValidate';

/**
 * The process commands' domain edits (docs/SPEC_BPMN.md § 9, phase B3): each changes only what it names, keeps every other node (identity), and
 * leaves the tree in the form the reader gives back (a saved and re-opened document is the same tree), valid against the profile.
 */
const base = (): XDocument => makeDefaultDoc().BPMN;
const act = (d: XDocument, id: string) => readProcess(d).activities.find((a) => a.id === id);
/** Same tree after a text round trip (the undo patches of a restored autosave address its nodes). */
const canonical = (d: XDocument): void => { const r = parseBpmn(serialize(d)); expect(r.errors).toEqual([]); expect(r.doc).toStrictEqual(d); };

describe('process.updateActivity / setScope', () => {
  it('writes the activity parameters in place; the rest of the tree keeps its identity', () => {
    const d0 = base(), d = updateActivity(d0, 'A017', { effort: 9, agentSup: 30, humanSup: 70, name: 'Code', seq: null });
    expect(act(d, 'A017')).toMatchObject({ effort: 9, agent: 30, human: 70, name: 'Code' });
    expect(act(d, 'A017')?.seq).toBeUndefined();
    expect(viewsOf(d).sdlc.find((a) => a.id === 'A017')).toMatchObject({ effort: 9, agentSup: 30, humanSup: 70 });
    const diagram = (x: XDocument) => x.root.children.find((c) => c.kind === 'element' && c.local === 'BPMNDiagram');
    expect(diagram(d)).toBe(diagram(d0));
    expect(updateActivity(d0, 'NOPE', { effort: 1 })).toBe(d0);
    expect(updateActivity(d0, 'A017', {})).toBe(d0);
    canonical(d);
  });
  it('setScope: activities, phases and norms (a norm by its industry:name key)', () => {
    const d = setScope(base(), ['A017', 'V2', 'MED:ISO 13485'], true), k = viewsOf(d).keys;
    expect(k.selectedArtefacts).toContain('A017');
    expect(k.phaseOff).not.toContain('V2');
    expect(k.selectedNorms).toContain('MED:ISO 13485');
    expect(viewsOf(setScope(d, ['A017'], false)).keys.selectedArtefacts).not.toContain('A017');
    expect(setScope(d, ['nothing'], false)).toBe(d);
  });
});

describe('process.addActivity / removeActivity', () => {
  it('adds a custom activity to its phase (F-B18 fields), in scope, refused on a used id or an unknown phase', () => {
    const d = addActivity(base(), CUSTOM), a = act(d, 'X100');
    expect(a).toMatchObject({ phase: 'V2', type: 'Human', effort: 3, human: 60, agent: 40, inScope: true, regulatory: false });
    expect(viewsOf(d).keys.selectedArtefacts).toContain('X100');
    expect(addActivity(d, CUSTOM)).toBe(d);
    expect(addActivity(base(), { ...CUSTOM, id: 'X101', phase: 'Z9' })).toBe(base());
    canonical(d);
  });
  it('removes the task, its deliverable and its diagram shapes; the rework flows that touch it go too', () => {
    const d = removeActivity(base(), 'A017'), text = serialize(d);
    expect(act(d, 'A017')).toBeUndefined();
    expect(text).not.toMatch(/"A017(_data|_di|_data_di)?"/);
    const loop = readProcess(base()).flows.find((f) => f.rework && (f.rework.activityA === 'A001' || f.rework.activityB === 'A001'));
    if (loop) expect(readProcess(removeActivity(base(), loop.source)).flows.some((f) => f.id === loop.id)).toBe(false);
    canonical(d);
  });
});

describe('process actors and phases', () => {
  it('addActor / updateActor / removeActor (refused while an activity names it)', () => {
    const d = addActor(base(), { id: 'role-sre', name: 'SRE', kind: 'role', teamSkill: 'Ops/Run' });
    expect(readProcess(d).actors.find((r) => r.id === 'role-sre')).toMatchObject({ name: 'SRE', kind: 'role', teamSkill: 'Ops/Run' });
    expect(viewsOf(d).keys.skillMap?.SRE).toBe('Ops/Run');
    expect(readProcess(updateActor(d, 'role-sre', { teamSkill: 'Lead' })).actors.find((r) => r.id === 'role-sre')?.teamSkill).toBe('Lead');
    expect(removeActor(base(), 'role-dev')).toBe(base());   // referenced by its activities
    expect(readProcess(removeActor(d, 'role-sre')).actors.some((r) => r.id === 'role-sre')).toBe(false);
    canonical(d);
  });
  it('addPhase / removePhase (refused while it holds activities) / reorderPhases', () => {
    const d = addPhase(base(), { id: 'V8', name: 'Hypercare', role: 'Ops' });
    expect(readProcess(d).phases.find((p) => p.id === 'V8')).toMatchObject({ name: 'Hypercare', role: 'Ops' });
    expect(removePhase(base(), 'V3')).toBe(base());
    expect(readProcess(removePhase(d, 'V8')).phases.some((p) => p.id === 'V8')).toBe(false);
    const r = reorderPhases(base(), ['V1', 'L0']);
    expect(viewsOf(r).phases.slice(0, 2).map((p) => p.id)).toEqual(['V1', 'L0']);
    canonical(d);
    canonical(r);
  });
  it.runIf(schemaTestsRun())('the edited documents stay valid (OMG XSDs + ac: + profile)', () => {
    const d = reorderPhases(addPhase(addActor(addActivity(updateActivity(base(), 'A017', { effort: 4 }), CUSTOM),
      { id: 'role-sre', name: 'SRE', kind: 'role', teamSkill: 'Ops/Run' }), { id: 'V8', name: 'Hypercare' }), ['V1', 'L0']);
    const dir = mkdtempSync(join(tmpdir(), 'ac-edit-')), file = join(dir, 'edited.bpmn');
    writeFileSync(file, serialize(removeActivity(d, 'A001')));
    const r = validate([file]).results[0];
    rmSync(dir, { recursive: true, force: true });
    expect(r).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
  }, 60_000);
});
