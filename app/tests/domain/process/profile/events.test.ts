import { describe, expect, it } from 'vitest';
import { setRaci } from '@/domain/org';
import { el, exportDocument, readProcess, serialize, type XDocument } from '@/domain/process';
import {
  addBoundary, addDefinition, addWait, cadenceOf, cycleOf, durationDays, escalationsOf, readEvents, serviceLevels, setCadence, waitsOf,
} from '@/domain/process/profile';
import { setAc } from '@/domain/process/profile/ext';
import { ACTIVITY_RANK, editDoc } from '@/domain/process/profile/tree';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../../helpers/bpmnValidate';
import { adding, custom, emptied, opened } from '../../../helpers/processCases';

/** Phase B5b, F-B45, F-B47, F-B48: timers, boundary events and reusable definitions written, read back, checked, and their BPSim encoding. */
const golden = opened('golden');
const pipe = (d: XDocument, ...fs: ((x: XDocument) => XDocument)[]): XDocument => fs.reduce((x, f) => f(x), d);
const doc = (): XDocument => pipe(adding(emptied(golden.BPMN), custom('C001'), custom('C002')),
  (d) => addDefinition(d, 'error', 'err-defect', 'Defect escaped', 'DEFECT'), (d) => addDefinition(d, 'escalation', 'esc-acc', 'Escalate to Accountable',
    'ESC'),
  (d) => addDefinition(d, 'signal', 'sig-release', 'Release published'), (d) => addDefinition(d, 'message', 'msg-package', 'Hand-off package'),
  (d) => addBoundary(d, { id: 'BE1', container: 'V3', attachedTo: 'C001', name: 'Defect escaped', trigger: { kind: 'error', ref: 'err-defect' }, target: 'C002',
    ext: [el('ac:rework', { probability: 0.1, costShare: 0.25 })] }),
  (d) => addBoundary(d, { id: 'SLA1', container: 'V3', attachedTo: 'C001', trigger: { kind: 'timer', duration: 'P3D' }, interrupting: false, target: 'C002' }),
  (d) => addBoundary(d, { id: 'ESC1', container: 'V3', attachedTo: 'C002', trigger: { kind: 'escalation', ref: 'esc-acc' } }),
  (d) => setCadence(d, 'Start', 'R/P2W'), (d) => addWait(d, 'V3', 'W1', 'P2D', 'Approval lead time'), (d) => addWait(d, 'V3', 'W2', 'PT12H'));

describe('ISO 8601 durations and cycles', () => {
  it('reads durations and repeating intervals as days, refuses the rest', () => {
    expect([durationDays('P2W'), durationDays('PT36H'), durationDays('P1M'), durationDays('P1Y2M3W4DT6H')]).toEqual([14, 1.5, 30,
      365 + 60 + 21 + 4 + 0.25]);
    expect(durationDays('PT30M')).toBeCloseTo(1 / 48, 12);
    expect([durationDays('P'), durationDays('2W'), durationDays('P2X'), durationDays('PT'), durationDays('P1.5D')]).toEqual([undefined, undefined, undefined,
      undefined, 1.5]);
    expect([cycleOf('R/P2W'), cycleOf('R4/2026-01-05T09:00:00Z/P1M'), cycleOf('P1D'), cycleOf('R/x')]).toEqual([{ days: 14 }, { days: 30, repeat: 4 },
      { days: 1 },
      undefined]);
  });
});

describe('events: written, read, checked', () => {
  const d = doc();
  it('reusable definitions: every reference resolves; the signal and message are not used yet', () => {
    const e = readEvents(d.root);
    expect(e.definitions.map((x) => x.id)).toEqual(['err-defect', 'esc-acc', 'sig-release', 'msg-package']);
    expect(e.unresolved).toEqual([]);
    expect(e.unused).toEqual(['sig-release', 'msg-package']);
    expect(readEvents(editDoc(d, 'ESC1_def', (x) => ({ ...x, attrs: [{ name: 'id', ns: '', value: 'ESC1_def' }, { name: 'escalationRef', ns: '',
      value: 'nope' }] })).root).unresolved)
      .toEqual([{ element: 'ESC1_def', ref: 'nope' }]);
  });
  it('boundary events: the error path is a rework loop (D-B20), the timer a non-interrupting service level of 3 days', () => {
    expect(readProcess(d).reworks).toEqual([{ id: 'BE1', name: 'Defect escaped', attachedTo: 'C001', target: 'C002', probability: 0.1, costShare: 0.25,
      internalIterations: 0 }]);
    expect(serviceLevels(d.root).map((b) => [b.id, b.days, b.interrupting, b.target])).toEqual([['SLA1', 3, false, 'C002']]);
  });
  it('cadence: a two-week cycle on the start event; waits per phase add up (2 days + 12 hours)', () => {
    expect(cadenceOf(d.root)).toEqual({ event: 'Start', iso: 'R/P2W', days: 14 });
    expect(waitsOf(d.root).get('V3')).toBe(2.5);
    expect(cadenceOf(setCadence(d, 'Start', null).root)).toBeUndefined();
  });
  it('escalation hands over to the Accountable: none is a finding, a RACI Accountable answers it', () => {
    expect(escalationsOf(d.root)).toEqual([{ event: 'ESC1', activity: 'C002', interrupting: true }]);
    const withA = setRaci(d, 'C002', { R: ['role-dev'], A: 'role-lead', C: [], I: [] });
    expect(escalationsOf(withA.root)[0]?.accountable).toBe('role-lead');
  });
  it('write → read → write is byte-identical', () => {
    const text = serialize(d), back = parseBpmn(text).doc!;
    expect(serialize(back)).toBe(text);
    expect(readEvents(back.root)).toEqual(readEvents(d.root));
  });
  it.runIf(schemaTestsRun())('the export validates (OMG XSDs + ac: + profile)', () => {
    expect(validateText(serialize(exportDocument({ ...golden, BPMN: d })), 'events.bpmn')).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
  }, 60_000);
});

describe('BPSim encoding of boundary rework (D-B5, F-B47)', () => {
  it('the export writes the probability on the flow leaving the event; without ac:rework it is read back from BPSim (cost share 0)', () => {
    const text = serialize(exportDocument({ ...golden, BPMN: doc() }));
    const probability = /elementRef="BE1_flow">\s*<bpsim:ControlParameters>\s*<bpsim:Probability>\s*<bpsim:FloatingParameter value="0.1"/;
    expect(text).toMatch(probability);
    const back = parseBpmn(text).doc!, bare = editDoc(back, 'BE1', (e) => setAc(e, 'rework', null, ACTIVITY_RANK));
    expect(readProcess(back).reworks[0]).toMatchObject({ id: 'BE1', probability: 0.1, costShare: 0.25 });
    expect(readProcess(bare).reworks).toEqual([{ id: 'BE1', name: 'Defect escaped', attachedTo: 'C001', target: 'C002', probability: 0.1, costShare: 0,
      internalIterations: 0 }]);
  });
});
