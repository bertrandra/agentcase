import { programmeValuesOf, withoutStoredValues } from '@/domain/process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyseImport, applyImport, DEFAULT_CHOICES, exportCaseText, previewImport, readProcess, serialize, viewsOf, type ImportChoices,
  type XDocument } from '@/domain/process';
import { makeDefaultDoc } from '@/store/instance';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validate } from '../../helpers/bpmnValidate';

/**
 * `process.import` as a pure function (docs/SPEC_BPMN.md F-B6–F-B9, F-B11, F-B12, D-B4, D-B10; phase B4): replace / merge of an AgentCase file,
 * mapping of foreign files (units → phases, roles → team skills), defaulted parameters, refusals, and the export → import → export round trip.
 */
const base = (): XDocument => makeDefaultDoc().BPMN;
const sample = (name: string): XDocument => parseBpmn(readFileSync(`fixtures/bpmn/${name}.bpmn`, 'utf8')).doc as XDocument;
const acts = (d: XDocument) => readProcess(d).activities;
const act = (d: XDocument, id: string) => acts(d).find((a) => a.id === id);
const run = (file: XDocument, c: Partial<ImportChoices>, cur = base()) => applyImport(cur, file, { ...DEFAULT_CHOICES, ...c });

describe('AgentCase files', () => {
  it('replace: export → import → export is byte-identical (F-B12), the pass-through and the scope come back', () => {
    const c = makeDefaultDoc(), text = exportCaseText(c), file = parseBpmn(text).doc as XDocument;
    const { doc } = run(file, { mode: 'replace' });
    expect(withoutStoredValues(doc)).toStrictEqual(file);   // B9c: the case's stored programme values are kept (an export leaves them out)
    expect(programmeValuesOf(doc)).toEqual(programmeValuesOf(c.BPMN));
    expect(exportCaseText({ ...c, BPMN: doc })).toBe(text);
    expect(viewsOf(doc).keys).toEqual(viewsOf(c.BPMN).keys);
  });
  it('replace refuses an in-scope-only file (F-B3); merge accepts it', () => {
    const c = makeDefaultDoc(), file = parseBpmn(exportCaseText(c, { partial: true })).doc as XDocument, a = analyseImport(c.BPMN, file);
    expect(a.partial).toBe(true);
    expect(previewImport(c.BPMN, a, { ...DEFAULT_CHOICES, mode: 'replace' }).refusal).toMatch(/in-scope-only/);
    expect(run(file, { mode: 'replace' }, c.BPMN).doc).toBe(c.BPMN);
    expect(run(file, { mode: 'merge' }, c.BPMN).doc).toBe(c.BPMN);   // same values: nothing changes
  });
  it('merge: known activities take the file\'s parameters and scope; the others are kept or switched out of scope; D-B4 skip', () => {
    const file = sample('minimal-agentcase'), a = analyseImport(base(), file), fileA017 = a.tasks.find((t) => t.id === 'A017')?.view;
    const { doc } = run(file, {});
    expect(act(doc, 'A017')).toMatchObject({ effort: fileA017?.effort, human: fileA017?.human, agent: fileA017?.agent });
    expect(act(doc, 'A001')).toEqual(act(base(), 'A001'));
    const out = run(file, { missing: 'outOfScope' }).doc;
    expect(act(out, 'A001')?.inScope).toBe(false);
    expect(acts(out).filter((x) => x.inScope).map((x) => x.id).sort()).toEqual(a.tasks.filter((t) => t.inScope).map((t) => t.id).sort());
    const skip = previewImport(base(), a, { ...DEFAULT_CHOICES, fileOutOfScope: 'skip' });
    expect(skip.skipped).toEqual(a.tasks.filter((t) => !t.inScope).map((t) => t.id));
    expect(act(run(file, { fileOutOfScope: 'skip' }).doc, 'A024')).toEqual(act(base(), 'A024'));
  });
});

describe('foreign files (F-B8, D-B10)', () => {
  const zeebe = sample('foreign-camunda8-zeebe'), map = { phaseOf: { 'sub:Activity_hypercare': 'L9' }, teamSkillOf: { 'QA Engineers': 'Test/QA' } };
  it('suggests the phase a sub-process names, matches tasks by name, flags unknown roles, counts what it does not map', () => {
    const a = analyseImport(base(), zeebe);
    expect(a.agentcase).toBe(false);
    expect(a.units.map((u) => [u.name, u.phase])).toEqual([['Specification', 'V1'], ['Hypercare', null]]);
    expect(a.tasks.map((t) => [t.name, t.match ?? null])).toEqual([['Requirements spec (SRS)', 'A006'], ['Monitor error rates', null]]);
    expect(a.roles).toEqual([{ name: 'Analysis', known: 'Analysis', teamSkill: 'Analysis/PO' }, { name: 'QA Engineers', known: null, teamSkill: null }]);
    expect(a.ignored).toMatchObject({ callActivity: 1, boundaryEvent: 1, sequenceFlow: 10, 'vendor extensions': 3 });
  });
  it('is refused (same document) until every new unit and role is mapped', () => {
    const p = previewImport(base(), analyseImport(base(), zeebe), DEFAULT_CHOICES);
    expect(p.unmappedUnits).toEqual(['Hypercare']);
    expect(p.unmappedRoles).toEqual(['QA Engineers']);
    const cur = base();
    expect(applyImport(cur, zeebe, DEFAULT_CHOICES).doc).toBe(cur);
  });
  it('merge: a known task goes in scope, a new one is added with defaulted parameters (its phase and type) and a new role; ids kept', () => {
    const { doc, added } = run(zeebe, map), v = readProcess(doc);
    expect(added).toEqual(['Activity_monitor']);
    expect(act(doc, 'A006')?.inScope).toBe(true);
    const m = act(doc, 'Activity_monitor'), same = acts(base()).filter((x) => x.phase === 'L9' && !x.regulatory && x.type === 'Agent');
    expect(m).toMatchObject({ phase: 'L9', type: 'Agent', name: 'Monitor error rates', inScope: true });   // a service task: the phase's agent
    expect(v.actors.find((r) => r.id === m?.performer)?.kind).toBe('agent');
    expect(m?.effort).toBeCloseTo(same.reduce((s, x) => s + x.effort, 0) / same.length, 2);
    expect(v.actors.find((r) => r.id === m?.humanPerformer)).toMatchObject({ name: 'QA Engineers', teamSkill: 'Test/QA', kind: 'role' });
    expect(viewsOf(doc).keys.skillMap?.['QA Engineers']).toBe('Test/QA');
    expect(acts(doc)).toHaveLength(acts(base()).length + 1);
  });
  it('replace: only the file\'s activities stay (phases and actors kept)', () => {
    const { doc } = run(zeebe, { ...map, mode: 'replace' });
    expect(acts(doc).map((x) => x.id).sort()).toEqual(['A006', 'Activity_monitor']);
    expect(readProcess(doc).phases).toHaveLength(readProcess(base()).phases.length);
    expect(readProcess(doc).flows.filter((f) => f.rework)).toEqual([]);   // the rework loops named removed activities
  });
  it('a foreign id that the case uses for another element gets a suffix; a second import of the same file matches by name', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="d" targetNamespace="x"><process id="p" name="Ops">
  <task id="Start" name="Patch the servers"/></process></definitions>`;
    const f = parseBpmn(xml).doc as XDocument, c = { phaseOf: { 'process:p': 'L9' } };
    const once = run(f, c);
    expect(once.added).toEqual(['Start-imp']);
    expect(act(once.doc, 'Start-imp')).toMatchObject({ name: 'Patch the servers', phase: 'L9' });
    expect(applyImport(once.doc, f, { ...DEFAULT_CHOICES, ...c }).added).toEqual([]);
    expect(run(zeebe, map).added).toEqual(['Activity_monitor']);
  });
  it.runIf(schemaTestsRun())('the imported documents stay valid (OMG XSDs + ac: + profile)', () => {
    const omg = sample('foreign-omg-plain'), a = analyseImport(base(), omg);
    const c = { phaseOf: Object.fromEntries(a.units.map((u) => [u.key, 'L9'])), teamSkillOf: Object.fromEntries(a.roles.map((r) => [r.name, 'Ops'])) };
    const dir = mkdtempSync(join(tmpdir(), 'ac-imp-')), files = [['merge', run(omg, c).doc], ['replace', run(zeebe, { ...map, mode: 'replace' }).doc]] as const;
    for (const [n, d] of files) writeFileSync(join(dir, `${n}.bpmn`), serialize(d));
    const r = validate(files.map(([n]) => join(dir, `${n}.bpmn`))).results;
    rmSync(dir, { recursive: true, force: true });
    for (const x of r) expect(x).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
  }, 60_000);
});

describe('performance (§ 10)', () => {
  it('maps a 2,000-task foreign file onto the case (analyse + apply) in well under a second', () => {
    const tasks = Array.from({ length: 2000 }, (_, i) => `  <userTask id="T${i}" name="Task ${i}"/>`).join('\n');
    const f = parseBpmn(`<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="d" targetNamespace="x"><process id="p">
${tasks}
</process></definitions>`).doc as XDocument, cur = base();
    const t0 = performance.now(), a = analyseImport(cur, f), r = applyImport(cur, f, { ...DEFAULT_CHOICES, phaseOf: { 'process:p': 'L9' } }, a);
    const ms = performance.now() - t0;
    expect(r.added).toHaveLength(2000);
    console.log(`2,000-task foreign import: ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(1000);
  });
});
