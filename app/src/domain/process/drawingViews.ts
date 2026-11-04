/** @calc-zone process-model */
import { linkPoints } from './buildDi';
import { compactDrawing } from './drawingCompact';
import type { DrawEdge, Drawing, DrawShape } from './drawing';
import type { XDocument } from './xml';
import { readProcess } from './read';

/**
 * Points of view of the process diagram (owner's request 2026-11-04): the same process drawn for different readers. `automation` is the
 * document's own diagram (agents in their lane, FX-D12); `process` is the pure process, no automation: there is no agents' lane and every
 * activity sits in the lane of the role that does it (its human performer's team skill), in the same phase column. More views can be added
 * here. A drawing view only: nothing is stored, no figure reads it.
 */
export const DIAGRAM_VIEWS = [
  { id: 'automation', label: 'With automation (agents)' },
  { id: 'process', label: 'Process only (no automation)' },
] as const;
export type DiagramViewId = (typeof DIAGRAM_VIEWS)[number]['id'];

const TW = 100, TH = 80, G = 20, STEP_X = TW + G, STEP_Y = TH + G;
const isAgentsLane = (s: DrawShape): boolean => s.kind === 'lane' && /agent/i.test(`${s.id} ${s.label}`);
const centreIn = (s: DrawShape, l: DrawShape): boolean => s.y + s.h / 2 >= l.y && s.y + s.h / 2 < l.y + l.h;

/** The lane (by its label) of each activity's role: the team skill of its human performer, else the performer's name. */
export function roleLanes(doc: XDocument): Map<string, string> {
  const v = readProcess(doc), actor = new Map(v.actors.map((a) => [a.id, a]));
  const out = new Map<string, string>();
  for (const a of v.activities) {
    const r = a.humanPerformer ? actor.get(a.humanPerformer) : undefined;
    if (r) out.set(a.id, r.teamSkill ?? r.name);
  }
  return out;
}

/** The drawing seen from point of view `view`; `lanes`: activity id → the label of its role's lane (`roleLanes`). */
export function drawingView(d: Drawing, view: DiagramViewId, lanes: ReadonlyMap<string, string>): Drawing {
  const agents = view === 'process' ? d.shapes.find(isAgentsLane) : undefined;
  if (!agents) return d;
  const laneBy = new Map(d.shapes.filter((s) => s.kind === 'lane' && s !== agents).map((s) => [s.label, s]));
  const phases = d.shapes.filter((s) => s.kind === 'phase'), acts = d.shapes.filter((s) => s.kind === 'activity');
  const moving = acts.filter((s) => centreIn(s, agents) && laneBy.has(lanes.get(s.id) ?? '') && phases.some((p) => p.id === s.phase));
  if (moving.length < acts.filter((s) => centreIn(s, agents)).length) return d;   // an agent activity without a role lane: keep the agents' lane
  // the cells (phase × role lane) that receive activities, their slots after the activities already there, and the height each lane needs
  const place = new Map<string, { lane: DrawShape; dx: number; row: number }>(), need = new Map<DrawShape, number>();
  for (const ph of phases) {
    const cols = Math.max(1, Math.floor((ph.w - G) / STEP_X));
    for (const lane of laneBy.values()) {
      const here = moving.filter((s) => lanes.get(s.id) === lane.label && s.phase === ph.id);
      if (!here.length) continue;
      const there = acts.filter((s) => !moving.includes(s) && centreIn(s, lane) && s.phase === ph.id), top = topOf(lane, acts, moving);
      const firstRow = there.length ? Math.max(0, Math.ceil((Math.max(...there.map((s) => s.y + s.h)) + G - (lane.y + top)) / STEP_Y)) : 0;
      here.forEach((s, i) => place.set(s.id, { lane, dx: G + (i % cols) * STEP_X, row: firstRow + Math.floor(i / cols) }));
      const rows = firstRow + Math.ceil(here.length / cols);
      need.set(lane, Math.max(need.get(lane) ?? 0, top + rows * STEP_Y - lane.h));
    }
  }
  // the y map: each receiving lane grows at its bottom by what it needs; the agents' band goes
  // (from just above its bottom edge: the phase boxes end 10 short of the last lane's edge and must grow with it; activities end 20 short)
  const grow = [...need].filter(([, n]) => n > 0).map(([l, n]) => ({ at: l.y + l.h - 15, by: n }));
  const cut = { from: agents.y, to: agents.y + agents.h };
  const fy = (y: number): number => {
    let v = y + grow.filter((g) => y >= g.at).reduce((s, g) => s + g.by, 0);
    if (y >= cut.to) v -= cut.to - cut.from; else if (y > cut.from) v -= y - cut.from;
    return v;
  };
  const moved = new Set(moving.map((s) => s.id));
  const shapes = d.shapes.filter((s) => s !== agents).map((s): DrawShape => {
    const p = place.get(s.id);
    if (p) {
      const ph = phases.find((x) => x.id === s.phase)!;
      return { ...s, x: ph.x + p.dx, y: fy(p.lane.y) + topOf(p.lane, acts, moving) + p.row * STEP_Y };
    }
    if (s.kind === 'activity' || s.kind === 'event' || s.kind === 'gateway' || s.kind === 'other') return { ...s, y: fy(s.y) };
    return { ...s, y: fy(s.y), h: fy(s.y + s.h) - fy(s.y) };
  });
  const at = new Map(shapes.map((s) => [s.id, s]));
  const edges = d.edges.map((e): DrawEdge => {
    if ((e.source && moved.has(e.source)) || (e.target && moved.has(e.target))) {
      const a = e.source ? at.get(e.source) : undefined, b = e.target ? at.get(e.target) : undefined;
      if (a && b) return { ...e, points: linkPoints(a, b) };
    }
    return { ...e, points: e.points.map(([x, y]) => [x, fy(y)] as [number, number]) };
  });
  const ys = shapes.flatMap((s) => [s.y, s.y + s.h]), y0 = Math.min(d.box.y, ...ys);
  return { box: { ...d.box, y: y0, h: Math.max(...ys) - y0 + G }, shapes, edges };
}

/** The top padding of a lane's grid: where its first activity sits, else two gaps. */
function topOf(lane: DrawShape, acts: DrawShape[], moving: DrawShape[]): number {
  const there = acts.filter((s) => !moving.includes(s) && centreIn(s, lane));
  return there.length ? Math.min(...there.map((s) => s.y)) - lane.y : 2 * G;
}

/**
 * One phase of the drawing (owner's request 2026-11-04, the diagram's phase filter): the phase's box and activities, the lanes and pool around
 * them, the flows between its activities; then compacted (`compactDrawing`: the lanes left empty go, the empty bands close). '' keeps every phase.
 */
export function onlyPhase(d: Drawing, phase: string): Drawing {
  if (!phase || !d.shapes.some((s) => s.kind === 'phase' && s.id === phase)) return d;
  const keep = (s: DrawShape): boolean => s.kind === 'pool' || s.kind === 'lane'
    || (s.kind === 'phase' ? s.id === phase : s.kind === 'activity' && s.phase === phase);
  const shapes = d.shapes.filter(keep), ids = new Set(shapes.map((s) => s.id));
  return compactDrawing({ box: d.box, shapes, edges: d.edges.filter((e) => !!e.source && !!e.target && ids.has(e.source) && ids.has(e.target)) });
}
