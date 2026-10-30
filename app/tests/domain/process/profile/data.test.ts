import { describe, expect, it } from 'vitest';
import { exportDocument, serialize, setScope, type XDocument } from '@/domain/process';
import {
  activityFacts, addDataRef, addDataStore, addImport, addItemType, agentBlocked, evidenceCount, gateStates, knowledgeHub, linkInput, linkOutput, readData,
  setDataState, setMultiInstance, setRequiresState, tokenProfile, typeData,
} from '@/domain/process/profile';
import { deliverableTrace, impactOf, normTraceability, traceGraph, upstreamOf } from '@/domain/process/trace';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../../helpers/bpmnValidate';
import { opened } from '../../../helpers/processCases';

/** Phase B5b, F-B40–F-B43: data, traceability, stores bound to tools, states and types written on the golden case's process and read back. */
const golden = opened('golden');
const pipe = (d: XDocument, ...fs: ((x: XDocument) => XDocument)[]): XDocument => fs.reduce((x, f) => f(x), d);
const DO178 = [...activityFacts(golden.BPMN.root).values()].filter((f) => f.norm === 'DO-178C').map((f) => f.id);
const doc = (): XDocument => pipe(golden.BPMN,
  (d) => setScope(d, ['A007', 'A017', 'A018', 'A023', 'R011'], true), (d) => setScope(d, ['A001', ...DO178.filter((x) => x !== 'R011')], false),
  (d) => addDataStore(d, { id: 'store-repo', name: 'Source repository', tools: [{ ref: 'git-host', integration: ['api', 'mcp'] }] }),
  (d) => addDataStore(d, { id: 'store-wiki', name: 'Wiki', tools: [{ ref: 'wiki', integration: ['export'] }] }),
  (d) => addDataStore(d, { id: 'store-kh', name: 'Knowledge Hub', tools: [{ ref: 'knowledge-hub', integration: ['mcp'] }] }),
  (d) => addDataRef(d, 'V3', { id: 'V3_repo', to: 'store-repo', store: true }), (d) => addDataRef(d, 'V3', { id: 'V3_wiki', to: 'store-wiki', store: true }),
  (d) => addDataRef(d, 'V3', { id: 'V3_kh', to: 'store-kh', store: true }), (d) => addDataRef(d, 'V4', { id: 'A023_ref', to: 'A023_data', state: 'draft' }),
  (d) => linkInput(d, 'A017', 'A007_data', 'Design'), (d) => linkInput(d, 'A023', 'A017_data'), (d) => linkInput(d, 'A017', 'V3_repo'),
  (d) => linkOutput(d, 'A017', 'V3_repo'), (d) => linkInput(d, 'A017', 'V3_wiki'), (d) => linkOutput(d, 'A018', 'V3_kh'), (d) => linkInput(d, 'A018',
    'A001_data'),
  (d) => linkOutput(d, 'A023', 'A023_ref'),
  (d) => addImport(d, { namespace: 'http://www.omg.org/spec/ReqIF/20110401/reqif.xsd', location: 'reqif.xsd', importType: 'http://www.w3.org/2001/XMLSchema' }),
  (d) => addItemType(d, { id: 'item-code', kind: 'code' }), (d) => addItemType(d, { id: 'item-doc', kind: 'document' }),
  (d) => typeData(d, 'A017_data', 'item-code'), (d) => typeData(d, 'A007_data', 'item-doc'));

describe('traceability graph (F-B40)', () => {
  const d = doc().root;
  it('upstream, downstream, impact', () => {
    expect(impactOf(d, 'A007')).toEqual(['A017', 'A023']);
    expect(upstreamOf(d, 'A023')).toEqual(['A017', 'A007']);
    expect(deliverableTrace(d, 'A017_data')).toEqual({ upstream: ['A017'], downstream: ['A023'] });
    expect(traceGraph(d).inputs.get('A017')).toEqual(['A007_data', 'store-repo', 'store-wiki']);
  });
  it('orphans and missing inputs (an input produced only out of scope is missing; a store never is)', () => {
    const g = traceGraph(d);
    expect(g.orphans).not.toContain('A007_data');
    expect(g.orphans).toContain('A018_data');
    expect(g.missing).toEqual([{ activity: 'A018', data: 'A001_data' }]);
  });
  it('"traceability complete" per norm: DO-178C becomes complete once its activity reads and writes', () => {
    expect(normTraceability(d, ['DO-178C'])).toEqual([{ norm: 'DO-178C', activities: 1, noInput: ['R011'], noOutput: ['R011'], missingInput: [],
      complete: false }]);
    const done = linkOutput(linkInput(doc(), 'R011', 'A017_data'), 'R011', 'A023_data').root;
    expect(normTraceability(done, ['DO-178C'])[0]).toMatchObject({ complete: true });
  });
});

describe('stores, states and types (F-B41–F-B43)', () => {
  const d = doc().root;
  it('an agent reading a store with no API, MCP or CLI is blocked; the Knowledge Hub curation load is its writers\' effort', () => {
    expect(agentBlocked(d)).toEqual([{ activity: 'A017', store: 'store-wiki' }]);
    expect(knowledgeHub(d)).toEqual({ store: 'store-kh', writers: ['A018'], readers: [], load: activityFacts(d).get('A018')?.effort });
  });
  it('evidence counts deliverables at "approved" or beyond; a collection counts its volume', () => {
    const before = evidenceCount(d), approved = setDataState(doc(), 'A023_ref', 'approved');
    expect(before.approved).toBe(0);
    expect(evidenceCount(approved.root).approved).toBe(1);
    const many = setMultiInstance(typeData(approved, 'A023_data', null, true), 'A023', { items: 30, per: 'sprint' });
    expect(evidenceCount(many.root)).toMatchObject({ approved: 30, baselined: 0 });
    expect(evidenceCount(many.root).deliverables - before.deliverables).toBe(29);
  });
  it('a gate requiring "approved": satisfied only when its inputs reached it', () => {
    const gate = (s: string) => gateStates(linkInput(setDataState(setRequiresState(doc(), 'A018', 'approved'), 'A023_ref', s), 'A018', 'A023_ref').root)
      .find((g) => g.activity === 'A018');
    expect(gate('baselined')?.inputs).toEqual([{ data: 'A001_data' }, { data: 'A023_data', state: 'baselined' }]);
    expect(gate('baselined')?.ok).toBe(false);
    const only = (s: string) => gateStates(linkInput(setDataState(setRequiresState(doc(), 'A035', 'approved'), 'A023_ref', s), 'A035', 'A023_ref').root)[0];
    expect([only('reviewed')?.ok, only('approved')?.ok, only('baselined')?.ok]).toEqual([false, true, true]);
  });
  it('types: the token profile follows what an activity produces; imports are listed', () => {
    expect([tokenProfile(d, 'A017'), tokenProfile(d, 'A007'), tokenProfile(d, 'A001')]).toEqual(['code', 'prose', undefined]);
    expect(readData(d).items.map((i) => [i.id, i.kind, i.import])).toEqual([['item-code', 'code', 'ac'], ['item-doc', 'document', 'ac']]);
    expect(readData(d).imports).toHaveLength(1);
  });
});

describe('round trip and schema', () => {
  it('write → read → write is byte-identical and reads back the same data view', () => {
    const text = serialize(doc()), back = parseBpmn(text).doc!;
    expect(serialize(back)).toBe(text);
    expect(readData(back.root)).toEqual(readData(doc().root));
  });
  it.runIf(schemaTestsRun())('the export validates (OMG XSDs + ac: + profile)', () => {
    expect(validateText(serialize(exportDocument({ ...golden, BPMN: doc() })), 'data.bpmn')).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
  }, 60_000);
});
