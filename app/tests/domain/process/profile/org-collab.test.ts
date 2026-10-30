import { describe, expect, it } from 'vitest';
import { orgOf } from '@/domain/org';
import { formalOrganisationView } from '@/domain/org/formalLanes';
import { allViews } from '@/domain/org/multiView';
import { catalogueProcess, exportDocument, readProcess, serialize, type XDocument } from '@/domain/process';
import {
  addMessageFlow, addPool, annotationsOf, assignmentChecks, assignmentsOf, bindAssignment, colourBy, coloursOf, conversationView, diagramsOf, handoffsOf,
  headerOf, interfacesOf, lanesOf, notesByElement, readCollab, setMultiplicity, withNotes,
} from '@/domain/process/profile';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../../helpers/bpmnValidate';
import { goldenAndB } from '../../../helpers/portfolio';
import { opened } from '../../../helpers/processCases';

/** Phase B5b, F-B54–F-B61: formal assignment and lanes, interfaces between units, conversations, annotations, several diagrams, colours, header. */
const golden = opened('golden'), base = catalogueProcess();
const valid = (d: XDocument, name: string) => expect(validateText(serialize(d), name)).toMatchObject({ schema: 'valid', errors: [], warnings: [] });

describe('formal assignment and lanes (F-B54)', () => {
  const d = bindAssignment(base, 'A017', 'role-dev', { team: 'P1 delivery team', grade: 'B', location: 'Portugal' });
  it('the performer binds parameters the resource declares; the § 16 chain reads as plain BPMN', () => {
    expect(assignmentsOf(d.root).filter((a) => a.activity === 'A017' && a.resource === 'role-dev'))
      .toEqual([{ activity: 'A017', kind: 'humanPerformer', resource: 'role-dev', bindings: { team: 'P1 delivery team', grade: 'B', location: 'Portugal' } }]);
    expect(assignmentChecks(d.root)).toEqual([]);
    expect(serialize(d)).toContain('<bpmn:resourceParameter id="role-dev-team" name="team" isRequired="false"/>');
  });
  it('a binding to an undeclared parameter is a finding', () => {
    const bad = parseBpmn(serialize(d).replace('parameterRef="role-dev-grade"', 'parameterRef="role-dev-level"')).doc!;
    expect(assignmentChecks(bad.root)).toEqual([{ activity: 'A017', resource: 'role-dev', parameter: 'role-dev-level' }]);
  });
  it('the organisation lanes are bound to their roles, and in the formal view each phase holds its own lane references', () => {
    const v = formalOrganisationView(base, orgOf(goldenAndB(), base), 'p1'), lanes = lanesOf(v.root);
    const roleLanes = lanes.filter((l) => l.partition);
    expect(roleLanes.length).toBeGreaterThan(0);
    expect(roleLanes.every((l) => readProcess(v).actors.some((a) => a.id === l.partition))).toBe(true);
    const inProcess = lanes.filter((l) => l.container === 'Process'), inPhases = lanes.filter((l) => l.container !== 'Process');
    expect(inProcess.flatMap((l) => l.refs).every((r) => readProcess(v).phases.some((p) => p.id === r))).toBe(true);
    const phaseOf = new Map(readProcess(v).activities.map((a) => [a.id, a.phase]));
    expect(inPhases.length).toBeGreaterThan(0);
    expect(inPhases.every((l) => l.refs.every((r) => phaseOf.get(r) === l.container))).toBe(true);
  });
  it.runIf(schemaTestsRun())('both validate', () => {
    valid(d, 'assign.bpmn');
    valid(formalOrganisationView(base, orgOf(goldenAndB(), base), 'p1'), 'formal-org.bpmn');
  }, 60_000);
});

describe('interfaces, multiplicity, conversations (F-B55–F-B57)', () => {
  const d = [
    (x: XDocument) => addPool(x, { id: 'pool-vendor', name: 'Offshore vendor', min: 1, max: 2 }), (x: XDocument) => addPool(x, { id: 'pool-run', name: 'Run' }),
    (x: XDocument) => addMessageFlow(x, { id: 'MF1', source: 'A017', target: 'pool-vendor', name: 'Code package', hours: 3 }),
    (x: XDocument) => addMessageFlow(x, { id: 'MF2', source: 'pool-vendor', target: 'A018', hours: 1, costShare: 0.02 }),
    (x: XDocument) => addMessageFlow(x, { id: 'MF3', source: 'A039', target: 'pool-run', hours: 2 }),
  ].reduce((x, f) => f(x), base);
  it('hand-offs per activity and coordination cost: (3 + 1) × 2 vendors + 2 = 10 hours', () => {
    expect(handoffsOf(d.root)).toEqual({ byActivity: new Map([['A017', 1], ['A018', 1], ['A039', 1]]), hours: 10 });
    expect(interfacesOf(d.root).get('Participant')).toEqual(['pool-vendor', 'pool-run']);
    expect(readCollab(setMultiplicity(d, 'pool-vendor', null).root).pools.find((p) => p.id === 'pool-vendor')).toMatchObject({ min: 1, max: 1 });
  });
  it('the conversation view: one conversation per pair of pools, with its flows and links', () => {
    const c = readCollab(conversationView(d).root).conversations;
    expect(c).toEqual([{ id: 'Conversation_1', name: 'Delivery process ↔ Offshore vendor', participants: ['Participant', 'pool-vendor'], flows: ['MF1',
      'MF2'] },
      { id: 'Conversation_2', name: 'Delivery process ↔ Run', participants: ['Participant', 'pool-run'], flows: ['MF3'] }]);
  });
  it('round trip, and the conversation view validates', () => {
    const text = serialize(d);
    expect(serialize(parseBpmn(text).doc!)).toBe(text);
    expect(readCollab(parseBpmn(text).doc!.root)).toEqual(readCollab(d.root));
    if (schemaTestsRun()) valid(conversationView(d), 'conversation.bpmn');
  }, 60_000);
});

describe('annotations, diagrams, colours, header (F-B58–F-B61)', () => {
  it('audit notes become annotations linked to their activity (unknown targets skipped)', () => {
    const d = withNotes(base, [{ target: 'A017', text: 'Pain point: flaky build' }, { target: 'A017', text: 'Tool: CI' }, { target: 'nope', text: 'x' }]);
    expect(annotationsOf(d.root).map((n) => [n.id, n.container, n.targets])).toEqual([['Note_A017_1', 'V3', ['A017']], ['Note_A017_2', 'V3', ['A017']]]);
    expect(notesByElement(d.root).get('A017')).toEqual(['Pain point: flaky build', 'Tool: CI']);
  });
  it('one file, several diagrams over one model: role view first, organisation view, one per phase', () => {
    const v = allViews(base, orgOf(goldenAndB(), base), 'p1'), ds = diagramsOf(v.root);
    expect(ds[0]).toMatchObject({ id: 'Diagram', plane: 'Collaboration' });
    expect(ds[1]).toMatchObject({ id: 'Diagram_org', name: 'By organisation', plane: 'Collaboration' });
    expect(ds.slice(2).map((x) => x.plane)).toEqual(readProcess(base).phases.map((p) => p.id));
    expect(readProcess(v).diagram).toEqual(readProcess(base).diagram);
    if (schemaTestsRun()) valid(v, 'views.bpmn');
  }, 60_000);
  it('colours by task type, with a legend; read back from BPMN-in-Color', () => {
    const v = colourBy(base, 'type'), c = coloursOf(v.root);
    expect(c.get('A017')?.stroke).not.toBe(c.get('A018')?.stroke);
    expect(c.get('A018')).toEqual(c.get('A011'));
    expect(annotationsOf(v.root).find((n) => n.id === 'Legend_type')?.text).toMatch(/^Colours by type: Human: #[0-9a-f]{6}; Manual: /);
    if (schemaTestsRun()) valid(v, 'colours.bpmn');
  }, 60_000);
  it('the export writes the header: exporter version, ac: extension, documentation processes; idempotent', () => {
    const x = exportDocument(golden), h = headerOf(x.root);
    expect(h).toMatchObject({ exporter: 'AgentCase', targetNamespace: 'https://agentcase.app/process', extension: true, documentation: true });
    expect(h.exporterVersion).toMatch(/^\d+\.\d+\.\d+/);
    const again = exportDocument({ ...golden, BPMN: parseBpmn(serialize(x)).doc! });
    expect(serialize(again)).toBe(serialize(x));
  });
});
