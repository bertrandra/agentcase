/** @calc-zone exports */
import { COLLABORATION_RANK, DEFINITIONS_RANK, fitted, insertChild } from '../process/profile/tree';
import { attr, doc, el, kids, NS, text, withChildren, type XDocument, type XElement, type XNode } from '../process/xml';
import { indent } from '../process/xmlWrite';
import { programmeDrawing } from './layout';
import type { ProgrammeActivity, ProgrammeView } from './model';

/**
 * The programme process in BPMN 2.0 (F-B64, F-B69; phase B9a): a participant `ac:programme="true"` with its process (a lane per role, the phases
 * and the waves as sub-processes, each activity a task with its documentation, `ac:programmeActivity` (kind, level, cost rule, timing, placement,
 * parameters) and `ac:raci` on the lanes, per-product activities multi-instance), message flows to the delivery participant, and its DI. Written
 * into an export only (the case stores the delivery process; the programme is derived until B9c). `withoutProgramme` takes it out of a file
 * before an import, so an export with both processes imports as the delivery process alone.
 */
const B = (local: string, a: Record<string, string | number | boolean | undefined>, c: XNode[] = []): XElement => el(`bpmn:${local}`, a, c);
const num = (n: number): string => String(Math.round(n * 100) / 100);

function task(a: ProgrammeActivity): XElement {
  const ext = el('ac:programmeActivity', { kind: a.kind, level: a.level, costRule: a.costRule, timing: a.timing, placement: a.placement.text,
    cost: a.cost.amount !== null && a.cost.amount >= 0 ? num(a.cost.amount) : undefined, active: a.active ? undefined : false },
  a.values.map((p) => el('ac:param', { key: p.def.key, value: p.value, unit: p.def.unit || undefined })));
  const raci = el('ac:raci', { responsible: `prog-lane-${a.lane}`, accountable: a.raci.A && `prog-lane-${a.raci.A}`,
    consulted: a.raci.C.map((r) => `prog-lane-${r}`).join(' ') || undefined, informed: a.raci.I.map((r) => `prog-lane-${r}`).join(' ') || undefined });
  const multi = a.instances !== null
    ? [B('multiInstanceLoopCharacteristics', { isSequential: false }, [B('loopCardinality', {}, [text(String(a.instances))])])] : [];
  return B('task', { id: a.id, name: a.name }, [B('documentation', {}, [text(a.description)]), B('extensionElements', {}, [ext, raci]), ...multi]);
}

/** A milestone (intermediate throw event) or a maturity gate (exclusive gateway): its criteria, placement and level, no cost. */
function milestone(m: ProgrammeView['milestones'][number]): XElement {
  const ext = el('ac:programmeActivity', { kind: m.kind, level: 'product', costRule: 'none', timing: 'engine', placement: m.placement });
  return B(m.element === 'gateway' ? 'exclusiveGateway' : 'intermediateThrowEvent', { id: m.id, name: m.name },
    [B('documentation', {}, [text(m.criteria)]), B('extensionElements', {}, [ext])]);
}

/** The programme's process element. */
export function programmeProcessElement(v: ProgrammeView): XElement {
  const lanes = v.lanes.map((l) => B('lane', { id: l.id, name: l.name },
    [...v.activities, ...v.milestones].filter((a) => `prog-lane-${a.lane}` === l.id).map((a) => B('flowNodeRef', {}, [text(a.id)]))));
  const laneSet = B('laneSet', { id: 'prog-LaneSet', 'ac:setupCapacity': v.capacity ?? undefined }, lanes);
  const inPhase = <T extends { phase: string }>(xs: T[], id: string): T[] => xs.filter((a) => `prog-phase-${a.phase}` === id);
  const phases = v.phases.map((p) => B('subProcess', { id: p.id, name: p.name }, [...inPhase(v.activities, p.id).map(task),
    ...inPhase(v.milestones, p.id).map(milestone)]));
  const stages = v.activities.filter((a) => a.phase === 'engagement');
  const flows = stages.slice(1).map((b, i) => B('sequenceFlow', { id: `prog-flow-${i + 1}`, sourceRef: stages[i]!.id, targetRef: b.id }));
  const waves = v.waves.map((w) => B('subProcess', { id: w.id, name: w.name }, [B('extensionElements', {}, [el('ac:wave', { code: w.id.slice(10),
    start: w.start, products: w.products.length, dependsOn: w.dependency ?? undefined })])]));
  return B('process', { id: 'prog-Process', name: v.participant.name, isExecutable: false, processType: 'None', 'ac:programme': true },
    [laneSet, ...phases, ...flows, ...waves]);
}

/** BPMN DI of the programme, `dy` below the delivery pool. */
function diOf(v: ProgrammeView, dy: number): XElement[] {
  const d = programmeDrawing(v), bounds = (x: number, y: number, w: number, h: number) => el('dc:Bounds', { x: num(x), y: num(y + dy), width: num(w),
    height: num(h) });
  const shapes = d.shapes.map((s) => el('bpmndi:BPMNShape', { id: `${s.id}_di`, bpmnElement: s.id,
    ...(s.kind === 'pool' || s.kind === 'lane' ? { isHorizontal: true } : s.kind === 'phase' ? { isExpanded: true } : {}) }, [bounds(s.x, s.y, s.w, s.h)]));
  const edges = d.edges.map((e) => el('bpmndi:BPMNEdge', { id: `${e.id}_di`, bpmnElement: e.id },
    e.points.map(([x, y]) => el('di:waypoint', { x: num(x), y: num(y + dy) }))));
  return [...shapes, ...edges];
}

const participant = (v: ProgrammeView): XElement => B('participant', { id: v.participant.id, name: v.participant.name, processRef: 'prog-Process',
  'ac:programme': true });
const messageFlows = (v: ProgrammeView, delivery: string): XElement[] => v.messageFlows.map((f) => B('messageFlow', { id: f.id, name: f.name,
  sourceRef: f.source, targetRef: f.target === v.deliveryParticipant ? delivery : f.target }));

/** The delivery document with the programme added (export "both"): participant and message flows in the collaboration, process, DI. */
export function withProgramme(d: XDocument, v: ProgrammeView): XDocument {
  let root = d.root;
  const collab = kids(root, NS.bpmn, 'collaboration')[0], diagram = kids(root, NS.bpmndi, 'BPMNDiagram')[0];
  if (!collab || !diagram) return d;
  const plane = kids(diagram, NS.bpmndi, 'BPMNPlane')[0]!, bottom = Math.max(0, ...kids(plane, NS.bpmndi, 'BPMNShape').flatMap((s) =>
    kids(s, NS.dc, 'Bounds').map((b) => Number(attr(b, 'y')) + Number(attr(b, 'height'))).filter(Number.isFinite)));
  const delivery = attr(kids(collab, NS.bpmn, 'participant')[0] ?? collab, 'id') ?? v.deliveryParticipant;
  let c = insertChild(collab, fitted(collab, participant(v)), COLLABORATION_RANK);
  for (const f of messageFlows(v, delivery)) c = insertChild(c, fitted(c, f), COLLABORATION_RANK);
  let p = plane;
  for (const e of diOf(v, bottom + 160)) p = withChildren(p, [...p.children.slice(0, -1), text('\n      '), fitted(p, e), ...p.children.slice(-1)]);
  const dia = withChildren(diagram, diagram.children.map((y) => (y === plane ? p : y)));
  root = withChildren(root, root.children.map((x) => (x === collab ? c : x === diagram ? dia
    : x)));
  root = insertChild(root, fitted(root, programmeProcessElement(v)), DEFINITIONS_RANK);
  return { ...d, root };
}

/** A file without the programme (its participant, process, message flows and DI): what an import reads in B9a. */
export function withoutProgramme(d: XDocument): XDocument {
  const procs = new Set(kids(d.root, NS.bpmn, 'process').filter((p) => attr(p, 'ac:programme') === 'true').map((p) => attr(p, 'id')));
  if (!procs.size) return d;
  const drop = (n: XNode): boolean => n.kind === 'element' && ((attr(n, 'id') ?? '').startsWith('prog-') || (attr(n, 'bpmnElement') ?? '').startsWith('prog-'));
  const strip = (e: XElement): XElement => {
    const out: XNode[] = [];
    for (const n of e.children) {
      if (drop(n)) { if (out.at(-1)?.kind === 'text' && !(out.at(-1) as { text: string }).text.trim()) out.pop(); continue; }
      out.push(n.kind === 'element' ? strip(n) : n);
    }
    return withChildren(e, out);
  };
  return { ...d, root: strip(d.root) };
}

/** The programme alone (export "programme only"): its pool, a black-box pool for the delivery process its message flows reach, and the DI. */
export function programmeDocument(v: ProgrammeView): XDocument {
  const ns = { 'xmlns:bpmn': NS.bpmn, 'xmlns:bpmndi': NS.bpmndi, 'xmlns:dc': NS.dc, 'xmlns:di': NS.di, 'xmlns:ac': NS.ac };
  const collab = B('collaboration', { id: 'prog-Collaboration' }, [participant(v), B('participant', { id: v.deliveryParticipant, name: 'Delivery process' }),
    ...messageFlows(v, v.deliveryParticipant)]);
  const plane = el('bpmndi:BPMNPlane', { id: 'prog-Plane', bpmnElement: 'prog-Collaboration' }, diOf(v, 0));
  const root = B('definitions', { ...ns, id: 'prog-Definitions', targetNamespace: 'https://agentcase.app/process' },
    [collab, programmeProcessElement(v), el('bpmndi:BPMNDiagram', { id: 'prog-Diagram' }, [plane])]);
  return doc(indent(root));
}
