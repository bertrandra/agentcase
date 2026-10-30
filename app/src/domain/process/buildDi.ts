/** @calc-zone process-model */
import type { FlowSpec } from './buildFlows';
import { CROSS_LANE_ID, diId, END_ID, FORK_ID, JOIN_ID, laneId, START_ID } from './ids';
import type { Box, Layout } from './layout';
import { CROSS_ID } from './types';
import { el, type AttrInput, type XElement } from './xml';

export const PARTICIPANT_ID = 'Participant';
export const COLLABORATION_ID = 'Collaboration';
type Pt = [number, number];

const shape = (id: string, b: Box, extra: AttrInput = {}): XElement => el('bpmndi:BPMNShape', { id: diId(id), bpmnElement: id, ...extra }, [
  el('dc:Bounds', { x: b.x, y: b.y, width: b.w, height: b.h }),
]);
const edge = (id: string, pts: Pt[]): XElement =>
  el('bpmndi:BPMNEdge', { id: diId(id), bpmnElement: id }, pts.map(([x, y]) => el('di:waypoint', { x, y })));
const cx = (b: Box): number => b.x + b.w / 2;
const cy = (b: Box): number => b.y + b.h / 2;

/** Waypoints of a flow: straight along the middle line, elbows for Cross-cutting, arcs above the boxes for rework (k-th one a little higher). */
function waypoints(f: FlowSpec, L: Layout, k: number): Pt[] {
  const box = (id: string): Box => ({ [START_ID]: L.start, [FORK_ID]: L.fork, [JOIN_ID]: L.join, [END_ID]: L.end })[id]
    ?? L.phases.get(id) ?? L.tasks.get(id) ?? { x: 0, y: 0, w: 0, h: 0 };
  const s = box(f.source), t = box(f.target);
  if (f.rework) {
    const top = Math.min(s.y, t.y) - 8 - 7 * k, sx = cx(s) + 10 * k, tx = cx(t) - 10 * k;
    return [[sx, s.y], [sx, top], [tx, top], [tx, t.y]];
  }
  if (f.target === CROSS_ID) return [[cx(s), s.y + s.h], [cx(s), cy(t)], [t.x, cy(t)]];
  if (f.source === CROSS_ID) return [[s.x + s.w, cy(s)], [cx(t), cy(s)], [cx(t), t.y + t.h]];
  return [[s.x + s.w, L.midY], [t.x, L.midY]];
}

/** The diagram (BPMN DI) of the generated process: pool, lanes, events, gateways, phases (expanded), activities, flows. */
export function diagramOf(L: Layout, flows: FlowSpec[]): XElement {
  const h = { isHorizontal: 'true' };
  const shapes = [
    shape(PARTICIPANT_ID, L.pool, h), ...L.lanes.map((l) => shape(laneId(l.teamSkill), l.box, h)), shape(CROSS_LANE_ID, L.crossLane, h),
    shape(START_ID, L.start), shape(FORK_ID, L.fork),
    ...[...L.phaseOrder, CROSS_ID].map((p) => shape(p, L.phases.get(p) as Box, { isExpanded: 'true' })),
    ...[...L.tasks.entries()].map(([id, b]) => shape(id, b)), shape(JOIN_ID, L.join), shape(END_ID, L.end),
  ];
  let k = 0;
  const edges = flows.map((f) => edge(f.id, waypoints(f, L, f.rework ? k++ : 0)));
  return el('bpmndi:BPMNDiagram', { id: 'Diagram' }, [el('bpmndi:BPMNPlane', { id: 'Plane', bpmnElement: COLLABORATION_ID }, [...shapes, ...edges])]);
}
