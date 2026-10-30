import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  activityFacts, annotationsOf, cadenceOf, changeFailureRate, compensationOf, effortFactors, gateStates, handoffsOf, headerOf, interfacesOf, readCollab,
  readData, readEvents, readLoops, storeAccess,
} from '@/domain/process/profile';
import { traceGraph } from '@/domain/process/trace';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { BPMN_FIXTURES } from '../../../helpers/bpmnValidate';

/**
 * Phase B5b (docs/SPEC_BPMN.md § 17): the hand-written sample of the extended profile (`fixtures/bpmn/extended-agentcase.bpmn`, B0) read by the
 * extended-profile readers: every element it holds gives the value the hand-written file says.
 */
const defs = parseBpmn(readFileSync(join(BPMN_FIXTURES, 'extended-agentcase.bpmn'), 'utf8')).doc!.root;

describe('extended sample: data (F-B40–F-B43)', () => {
  it('the data store is bound to its tool; the deliverable is a typed collection in state "reviewed"', () => {
    const v = readData(defs);
    expect(v.nodes.find((n) => n.id === 'store-backlog')).toMatchObject({ store: true, tools: [{ ref: 'jira', integration: ['api', 'mcp'],
      hosting: 'saas' }] });
    expect(v.nodes.find((n) => n.id === 'tests')).toMatchObject({ store: false, collection: true, item: 'item-test-suite' });
    expect(v.links).toEqual([
      { activity: 'A023', data: 'store-backlog', dir: 'in', via: 'backlog-ref' }, { activity: 'A023', data: 'tests', dir: 'out', via: 'tests-ref',
        state: 'reviewed' },
    ]);
    expect(v.unbound).toEqual([]);
  });
  it('trace: the store is a source (never missing), the test suite is produced and never consumed (orphan)', () => {
    const g = traceGraph(defs);
    expect(g.orphans).toEqual(['tests']);
    expect(g.missing).toEqual([]);
    expect(storeAccess(defs)).toEqual([{ activity: 'A023', agent: false, stores: ['store-backlog'], tools: ['jira'], integration: ['api', 'mcp'],
      blocked: [] }]);
  });
  it('the gate requires "approved" and has no input: not satisfied', () => {
    expect(gateStates(defs)).toEqual([{ activity: 'A032', requires: 'approved', inputs: [], ok: false }]);
  });
});

describe('extended sample: volumes, events, compensation (F-B44–F-B50)', () => {
  it('multi-instance A023: 40 items per sprint (ac:volume), effort counted 40 times', () => {
    expect(readLoops(defs).multi.get('A023')).toMatchObject({ sequential: false, cardinality: 40, items: 40, volume: { items: 40, per: 'sprint',
      source: 'toolExport' } });
    expect(effortFactors(defs).get('A023')).toEqual({ factor: 40, reasons: ['volume'] });
  });
  it('cadence: a two-week sprint (R/P2W = 14 days)', () => {
    expect(cadenceOf(defs)).toEqual({ event: 'start-sprint', iso: 'R/P2W', days: 14 });
  });
  it('definitions, boundary events and their references', () => {
    const e = readEvents(defs);
    expect(e.definitions.map((x) => [x.id, x.kind, x.code])).toEqual([['err-defect-escaped', 'error', 'DEFECT_ESCAPED'], ['esc-accountable', 'escalation',
      'ESCALATE'],
      ['msg-handoff', 'message', undefined]]);
    expect(e.boundary.find((b) => b.id === 'A023-defect')).toMatchObject({ kind: 'error', ref: 'err-defect-escaped', interrupting: false, attachedTo: 'A023',
      target: 'esc-throw' });
    expect(e.unresolved).toEqual([]);
    expect(e.unused).toEqual([]);
  });
  it('event sub-process: triggered by a signal twice a month, its task counted twice', () => {
    expect(readEvents(defs).eventSubs).toEqual([{ id: 'evt-vulnerability', name: 'Security vulnerability', container: 'proc-main', kind: 'signal',
      interrupting: false, activities: ['A040'], frequency: { count: 2, per: 'month' } }]);
    expect(effortFactors(defs).get('A040')).toEqual({ factor: 2, reasons: ['frequency'] });
  });
  it('compensation: A034 rolls back A030 with a 15 % change-failure rate', () => {
    expect(compensationOf(defs)).toEqual([{ handler: 'A034', activity: 'A030', event: 'A030-compensate', probability: 0.15, rated: true, effort: 0,
      expected: 0 }]);
    expect(changeFailureRate(defs)).toBe(0.15);
    expect(effortFactors(defs).get('A034')).toEqual({ factor: 0.15, reasons: ['compensation'] });
  });
});

describe('extended sample: task types, interfaces, annotations, header (F-B53–F-B61)', () => {
  it('task types (D-B23): script, send and business-rule tasks', () => {
    const f = activityFacts(defs);
    expect(['A023', 'A031', 'A032', 'A033', 'A030', 'A034', 'A040'].map((id) => f.get(id)?.type))
      .toEqual(['Human', 'BusinessRule', 'Review', 'Script', 'Send', 'Manual', 'Manual']);
  });
  it('a black-box pool of up to three vendors: the 4-hour hand-off counts three times, plus the send task 2 hours', () => {
    const c = readCollab(defs);
    expect(c.pools.find((p) => p.id === 'pool-vendors')).toEqual({ id: 'pool-vendors', name: 'Test vendors', min: 1, max: 3 });
    expect(c.flows).toEqual([{ id: 'mf-handoff', name: 'Test package', source: 'A030', target: 'pool-vendors', from: 'pool-delivery', to: 'pool-vendors',
      message: 'msg-handoff', hours: 4, costShare: 0.05 }]);
    expect(interfacesOf(defs)).toEqual(new Map([['pool-delivery', ['pool-vendors']], ['pool-vendors', ['pool-delivery']]]));
    const h = handoffsOf(defs);
    expect(h.hours).toBe(4 * 3 + 2);
    expect(h.byActivity.get('A030')).toBe(1);
  });
  it('the annotation of A023, the file header', () => {
    expect(annotationsOf(defs)).toEqual([{ id: 'note-1', container: 'proc-main', text: 'Audit: test data copied by hand (pain point, severity 4).',
      targets: ['A023'] }]);
    expect(headerOf(defs)).toEqual({ exporter: 'AgentCase', exporterVersion: '0.0.0-sample', targetNamespace: 'https://agentcase.app/cases/sample-extended',
      extension: true, documentation: true });
  });
});
