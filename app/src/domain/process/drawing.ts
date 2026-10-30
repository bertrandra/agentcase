/** @calc-zone process-model */
import { readProcess } from './read';
import { attr, type XDocument, type XElement } from './xml';

/**
 * What the Process section draws (spec F-B13, F-B15; phase B4): the shapes and edges of the document's BPMN DI, typed by the element they show,
 * and a place for every activity the diagram does not hold yet (added in AgentCase or imported): in its phase, in rows under the phase's other
 * activities (the phase box grows to hold them), without moving any element that has a shape. A document without any diagram is laid out as
 * one column per phase. Read-only and memoised on the document; nothing here is stored.
 */
export type ShapeKind = 'pool' | 'lane' | 'phase' | 'activity' | 'event' | 'gateway' | 'other';
export interface DrawShape {
  id: string; kind: ShapeKind; x: number; y: number; w: number; h: number; label: string;
  inScope?: boolean; regulatory?: boolean; phase?: string;
  /** placed by the layout (no BPMN DI shape yet) */
  placed?: boolean;
  /** a second line under the label: the multi-instance marker of a programme activity, the facts of a wave (B9a) */
  marker?: string;
}
/** `message`: a message flow between pools (the programme's flows to the delivery process, B9a), drawn dashed. */
export interface DrawEdge { id: string; points: [number, number][]; rework: boolean; message?: boolean }
export interface Drawing { box: { x: number; y: number; w: number; h: number }; shapes: DrawShape[]; edges: DrawEdge[] }

const KIND: Record<string, ShapeKind> = { participant: 'pool', lane: 'lane', subProcess: 'phase', adHocSubProcess: 'phase', startEvent: 'event',
  endEvent: 'event', exclusiveGateway: 'gateway', parallelGateway: 'gateway', inclusiveGateway: 'gateway' };
const ORDER: ShapeKind[] = ['pool', 'lane', 'phase', 'other', 'event', 'gateway', 'activity'];
const TW = 100, TH = 70, G = 20, COL = TW + 2 * G;

/** Every element with an id: its local name and name (the DI's `bpmnElement` targets). */
function elementsOf(root: XElement): Map<string, { local: string; name: string }> {
  const out = new Map<string, { local: string; name: string }>(), walk = (e: XElement): void => {
    const id = attr(e, 'id');
    if (id !== undefined) out.set(id, { local: e.local, name: attr(e, 'name') ?? '' });
    for (const c of e.children) if (c.kind === 'element') walk(c);
  };
  walk(root);
  return out;
}

/** Shapes for the activities without one: under the other activities of their phase, or (no phase shape) in a column per phase. */
function placeMissing(v: ReturnType<typeof readProcess>, shapes: DrawShape[]): void {
  const has = new Set(shapes.map((s) => s.id)), right = Math.max(0, ...shapes.map((s) => s.x + s.w));
  let freeCol = 0;
  for (const p of v.phases) {
    const missing = v.activities.filter((a) => a.phase === p.id && !has.has(a.id));
    if (!missing.length) continue;
    let box = shapes.find((s) => s.id === p.id);
    if (!box) {
      box = { id: p.id, kind: 'phase', x: right + G + freeCol++ * (COL + G), y: 0, w: COL, h: 40, label: p.name, inScope: p.inScope !== false, placed: true };
      shapes.push(box);
    }
    const inside = shapes.filter((s) => s.kind === 'activity' && s.phase === p.id), top = Math.max(box.y + 30, ...inside.map((s) => s.y + s.h + G));
    const perRow = Math.max(1, Math.floor((box.w - G) / (TW + G)));
    missing.forEach((a, i) => shapes.push({ id: a.id, kind: 'activity', x: box.x + G + (i % perRow) * (TW + G), y: top + Math.floor(i / perRow) * (TH + G),
      w: TW, h: TH, label: a.name, inScope: a.inScope !== false, regulatory: a.regulatory, phase: p.id, placed: true }));
    const bottom = top + Math.ceil(missing.length / perRow) * (TH + G);
    if (bottom > box.y + box.h) box.h = bottom - box.y;
  }
}

const memo = new WeakMap<XDocument, Drawing>();
export function drawingOf(d: XDocument): Drawing {
  const hit = memo.get(d);
  if (hit) return hit;
  const v = readProcess(d), els = elementsOf(d.root), acts = new Map(v.activities.map((a) => [a.id, a])), phases = new Map(v.phases.map((p) => [p.id, p]));
  const shapes: DrawShape[] = v.diagram.shapes.map((s) => {
    const e = els.get(s.element), a = acts.get(s.element), p = phases.get(s.element);
    const kind: ShapeKind = a ? 'activity' : KIND[e?.local ?? ''] ?? 'other', out: DrawShape = { id: s.element, kind, x: s.x, y: s.y, w: s.w, h: s.h,
      label: e?.name ?? '' };
    if (a) Object.assign(out, { inScope: a.inScope !== false, regulatory: a.regulatory, phase: a.phase });
    if (p) out.inScope = p.inScope !== false;
    return out;
  });
  placeMissing(v, shapes);
  shapes.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const rework = new Set(v.flows.filter((f) => f.rework).map((f) => f.id));
  const edges = v.diagram.edges.filter((e) => e.points.length > 1).map((e) => ({ id: e.element, points: e.points, rework: rework.has(e.element) }));
  const xs = [...shapes.flatMap((s) => [s.x, s.x + s.w]), ...edges.flatMap((e) => e.points.map((p) => p[0]))];
  const ys = [...shapes.flatMap((s) => [s.y, s.y + s.h]), ...edges.flatMap((e) => e.points.map((p) => p[1]))];
  const x0 = xs.length ? Math.min(...xs) : 0, y0 = ys.length ? Math.min(...ys) : 0;
  const out: Drawing = { box: { x: x0 - G, y: y0 - G, w: Math.max(x0 + 100, ...xs) - x0 + 2 * G, h: Math.max(y0 + 100, ...ys) - y0 + 2 * G }, shapes, edges };
  memo.set(d, out);
  return out;
}
