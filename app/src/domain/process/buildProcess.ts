/** @calc-zone process-model */
import { actorsOf, normsOf } from './buildActors';
import { COLLABORATION_ID, diagramOf, PARTICIPANT_ID } from './buildDi';
import { flowElement, flowsOf, type FlowSpec } from './buildFlows';
import { dataObjectOf, taskOf } from './buildTasks';
import { CROSS_LANE_ID, END_ID, FORK_ID, JOIN_ID, laneId, PROCESS_ID, START_ID } from './ids';
import { layoutOf } from './layout';
import { CROSS_ID, type CatPhase, type ProcessCatalogue } from './types';
import { doc, el, NS, text, type XDocument, type XElement } from './xml';

/** The process-level parameters (`ac:process`): the schema the document belongs to. Case parameters are added by `processFromCase`. */
export const CASE_SCHEMA = '3';

function phaseElement(c: ProcessCatalogue, p: CatPhase, order: number | null, flows: FlowSpec[]): XElement {
  const cross = p.id === CROSS_ID, inPhase = <T extends { phase: string }>(xs: T[]) => xs.filter((a) => a.phase === p.id);
  const ext = el('bpmn:extensionElements', {}, [el('ac:phase', {
    code: p.id, seq: p.seq, role: p.role || null, crossCutting: cross ? 'true' : null, order, sdlc: p.sdlc, reg: p.reg,
    featureIds: p.featureIds ? p.featureIds.join(' ') : null,
  })]);
  const tasks = [
    ...c.sdlc.map((a, i) => (a.phase === p.id ? taskOf(a, i + 1, false) : null)),
    ...c.reg.map((a, i) => (a.phase === p.id ? taskOf(a, i + 1, true) : null)),
  ].filter((x): x is XElement => x !== null);
  const data = inPhase(c.sdlc).filter((a) => a.deliverable).map(dataObjectOf);
  const inner = flows.filter((f) => f.inner === p.id).map(flowElement);
  return el(cross ? 'bpmn:adHocSubProcess' : 'bpmn:subProcess', { id: p.id, name: p.name }, [ext, ...tasks, ...data, ...inner]);
}

/**
 * The default process document built from a catalogue (spec § 3, § 5.2, § 6.3): categories (norms), resources (roles, agents), a
 * collaboration with one pool, the process (lanes, phases as sub-processes in sequence, Cross-cutting in parallel, rework back flows)
 * and its BPMN DI. No case scope: `processFromCase` adds it. Deterministic: same catalogue, same tree.
 */
export function buildProcess(c: ProcessCatalogue): XDocument {
  const L = layoutOf(c), flows = flowsOf(c, L.phaseOrder), byId = new Map(c.phases.map((p, i) => [p.id, { p, i }]));
  const phases = L.phaseOrder.map((id) => { const x = byId.get(id) as { p: CatPhase; i: number }; return phaseElement(c, x.p, x.i + 1, flows); });
  const lanes = el('bpmn:laneSet', { id: 'LaneSet' }, [
    ...L.lanes.map((l) => el('bpmn:lane', { id: laneId(l.teamSkill), name: l.teamSkill })),
    el('bpmn:lane', { id: CROSS_LANE_ID, name: 'Cross-cutting' }, [el('bpmn:flowNodeRef', {}, [text(CROSS_ID)])]),
  ]);
  const process = el('bpmn:process', { id: PROCESS_ID, name: 'Delivery process', isExecutable: 'false' }, [
    el('bpmn:extensionElements', {}, [el('ac:process', { caseSchema: CASE_SCHEMA })]), lanes,
    el('bpmn:startEvent', { id: START_ID, name: 'Start' }), el('bpmn:parallelGateway', { id: FORK_ID, gatewayDirection: 'Diverging' }),
    ...phases, phaseElement(c, { ...c.crossCutting }, null, flows),
    el('bpmn:parallelGateway', { id: JOIN_ID, gatewayDirection: 'Converging' }), el('bpmn:endEvent', { id: END_ID, name: 'End' }),
    ...flows.filter((f) => !f.inner).map(flowElement),
  ]);
  const root = el('bpmn:definitions', {
    'xmlns:bpmn': NS.bpmn, 'xmlns:bpmndi': NS.bpmndi, 'xmlns:dc': NS.dc, 'xmlns:di': NS.di, 'xmlns:ac': NS.ac,
    id: 'Definitions', targetNamespace: 'https://agentcase.app/process', exporter: 'AgentCase',
  }, [
    ...normsOf(c), ...actorsOf(c),
    el('bpmn:collaboration', { id: COLLABORATION_ID }, [el('bpmn:participant', { id: PARTICIPANT_ID, name: 'Delivery process', processRef: PROCESS_ID })]),
    process, diagramOf(L, flows),
  ]);
  return doc(root);
}
