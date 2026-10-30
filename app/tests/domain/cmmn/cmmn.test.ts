import { describe, expect, it } from 'vitest';
import { applyCmmn, cmmnDocument, isCmmn, readCmmn } from '@/domain/cmmn';
import { readProcess, serialize, type XDocument } from '@/domain/process';
import { taskOf } from '@/domain/process/buildTasks';
import { readEvents } from '@/domain/process/profile';
import { addEventSub, addInside } from '@/domain/process/profile/eventWrite';
import { withAttrs, type XElement } from '@/domain/process/xml';
import { parseXml } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../helpers/bpmnValidate';
import { custom, opened } from '../../helpers/processCases';

/**
 * Phase B7b, F-B63 / D-B25: the CMMN view of the run phase (L9). The golden case's L9 holds 35 activities; the reference adds an event sub-process
 * "Incident" (4 per month) with one task C009 inside L9. The export is a CMMN 1.1 case validated against the OMG schema; the read-back maps names,
 * roles and frequencies onto the process and reports the rest.
 */
const golden = opened('golden');
const task = (id: string, effort: number): XElement => withAttrs(taskOf(custom(id, { effort, phase: 'L9' }), 900, false), { 'ac:inScope': 'true' });
const withIncident = (): XDocument => addInside(addEventSub(golden.BPMN, { id: 'EV1', name: 'Incident', container: 'L9', trigger: { kind: 'signal' },
  frequency: { count: 4, per: 'month' } }), 'EV1', task('C009', 2));
const runActs = (d: XDocument) => readProcess(d).activities.filter((a) => a.phase === 'L9');

describe('CMMN export of the run phase (F-B63)', () => {
  const d = withIncident(), text = serialize(cmmnDocument(d, '0.0.0-test')), v = readCmmn(parseXml(text).doc?.root ?? d.root);
  it('a human task (or task) per activity of L9, a repeatable stage for the event sub-process, a milestone after every item (L9 is named "Run / AMS")', () => {
    expect(isCmmn(cmmnDocument(d, 'x').root)).toBe(true);
    expect(v.tasks.map((t) => t.id).sort()).toEqual(runActs(d).map((a) => a.id).sort());
    expect(v.stages).toEqual([{ id: 'EV1', name: 'Incident', frequency: { count: 4, per: 'month' } }]);
    expect(text).toContain('<cmmn:planItem id="PI_EV1" definitionRef="EV1">');
    expect(text).toContain('<cmmn:repetitionRule/>');
    expect(text).toContain('<cmmn:milestone id="MS_L9" name="Run / AMS complete"/>');
    expect(v.ignored).toEqual({ sentry: 1, planItemOnPart: runActs(golden.BPMN).length + 1, standardEvent: runActs(golden.BPMN).length + 1,
      entryCriterion: 1, milestone: 1, itemControl: 1, repetitionRule: 1 });
  });
  it('deterministic, and write → parse → write byte-identical', () => {
    expect(serialize(cmmnDocument(withIncident(), '0.0.0-test'))).toBe(text);
    expect(serialize(parseXml(text).doc as XDocument)).toBe(text);
  });
  it('a phase the process does not hold gives an empty definitions', () => {
    expect(readCmmn(cmmnDocument(golden.BPMN, 'x', ['NOPE']).root)).toEqual({ tasks: [], stages: [], ignored: {} });
  });
  it.runIf(schemaTestsRun())('validates against CMMN11.xsd (+ ac:)', () => {
    expect(validateText(text, 'run.cmmn')).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
    expect(validateText(serialize(cmmnDocument(golden.BPMN, '0.0.0-test')), 'golden.cmmn')).toMatchObject({ schema: 'valid', errors: [] });
  }, 60_000);
});

describe('CMMN read-back (D-B25 a: what maps)', () => {
  const d = withIncident(), first = runActs(d).find((a) => a.humanPerformer && a.id !== 'C009');
  const roles = readProcess(d).actors.filter((a) => a.kind === 'role'), other = roles.find((r) => r.id !== first?.humanPerformer);
  it('names, roles (by name) and frequencies of known elements are applied; unknown ids are reported', () => {
    const v = readCmmn(cmmnDocument(d, 'x').root);
    const edited = { ...v, tasks: [...v.tasks.map((t) => (t.id === first?.id ? { ...t, name: 'Renamed', role: other?.name ?? '' } : t)),
      { id: 'ZZZ', name: 'Unknown' }], stages: v.stages.map((s) => ({ ...s, frequency: { count: 6, per: 'month' } })) };
    const r = applyCmmn(d, edited);
    expect(r.updated).toEqual([first?.id, 'EV1']);
    expect(r.unknown).toEqual(['ZZZ']);
    expect(readProcess(r.doc).activities.find((a) => a.id === first?.id)).toMatchObject({ name: 'Renamed', humanPerformer: other?.id });
    expect(readEvents(r.doc.root).eventSubs.find((s) => s.id === 'EV1')?.frequency).toEqual({ count: 6, per: 'month' });
  });
  it('an unchanged export read back changes nothing', () => {
    const r = applyCmmn(d, readCmmn(cmmnDocument(d, 'x').root));
    expect([r.doc === d, r.updated, r.unknown]).toEqual([true, [], []]);
  });
});
