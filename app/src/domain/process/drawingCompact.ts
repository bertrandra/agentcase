/** @calc-zone process-model */
import { bridgesOver } from './bridge';
import { linkPoints } from './buildDi';
import type { DrawEdge, Drawing, DrawShape } from './drawing';

/**
 * A compact drawing (owner's request 2026-11-03: hiding the out-of-scope activities leaves a mostly empty grid of phases × roles). The phases and
 * lanes left without any activity, event or gateway are dropped; every band of the drawing, across or down, that no remaining element touches is
 * shrunk to a small gap; the remaining shapes and the flows' points move with the bands (a piecewise-linear map of x and of y). The order of the
 * elements and their sizes are kept: only the empty space goes. A flow to a dropped phase or lane goes with it, bridged to what follows the phase
 * (as `hideActivities` bridges hidden activities), and a pool, lane or phase ends a little after the last element it still holds. A drawing view, never stored.
 */
const CONTENT_KINDS: readonly DrawShape['kind'][] = ['activity', 'event', 'gateway', 'other'];
const isContent = (s: DrawShape): boolean => CONTENT_KINDS.includes(s.kind);
const PAD = 20, KEEP = 40;

type Axis = { start: number; end: number; size: number };
/** The empty bands between the content intervals (each widened by PAD), larger than KEEP. */
function gapsOf(spans: [number, number][]): Axis[] {
  const s = spans.map(([a, b]) => [a - PAD, b + PAD] as [number, number]).sort((p, q) => p[0] - q[0]), out: Axis[] = [];
  let end = s[0]?.[1] ?? 0;
  for (const [a, b] of s.slice(1)) {
    if (a - end > KEEP) out.push({ start: end, end: a, size: a - end });
    end = Math.max(end, b);
  }
  return out;
}
/** The map of one axis: a point in a gap moves to its share of the KEEP left of that gap; a point after it moves by what the gap lost. */
function mapOf(gaps: Axis[]): (v: number) => number {
  return (v) => {
    let shift = 0;
    for (const g of gaps) {
      if (v >= g.end) shift += g.size - KEEP;
      else if (v > g.start) return v - shift - (v - g.start) + ((v - g.start) * KEEP) / g.size;
      else break;
    }
    return v - shift;
  };
}

/** The drawing `d` with its empty phases and lanes dropped and its empty bands closed. */
export function compactDrawing(d: Drawing): Drawing {
  const content = d.shapes.filter(isContent);
  if (!content.length) return d;
  const holds = (c: DrawShape) => content.some((s) => s.x + s.w / 2 >= c.x && s.x + s.w / 2 <= c.x + c.w && s.y + s.h / 2 >= c.y && s.y + s.h / 2 <= c.y + c.h);
  const kept = d.shapes.filter((s) => (s.kind === 'phase' || s.kind === 'lane' ? holds(s) : true)), keptIds = new Set(kept.map((s) => s.id));
  const gone = new Set(d.shapes.filter((s) => !keptIds.has(s.id)).map((s) => s.id));
  const fx = mapOf(gapsOf(content.map((s) => [s.x, s.x + s.w]))), fy = mapOf(gapsOf(content.map((s) => [s.y, s.y + s.h])));
  const moved = content.map((s) => ({ x: fx(s.x), y: fy(s.y), w: s.w, h: s.h }));
  const right = Math.max(...moved.map((s) => s.x + s.w)) + KEEP, bottom = Math.max(...moved.map((s) => s.y + s.h)) + KEEP;
  const shapes = kept.map((s): DrawShape => {
    const x = fx(s.x), y = fy(s.y);
    if (isContent(s)) return { ...s, x, y };
    return { ...s, x, y, w: Math.min(fx(s.x + s.w), right) - x, h: Math.min(fy(s.y + s.h), bottom) - y };
  });
  const flows = d.edges.filter((e) => e.source !== undefined && e.target !== undefined)
    .map((e) => ({ source: e.source as string, target: e.target as string, container: '', ...(e.rework ? { rework: true } : {}) }));
  const at = new Map(shapes.map((s) => [s.id, s]));
  const bridges = bridgesOver(flows, gone).flatMap((b): DrawEdge[] => {
    const a = at.get(b.source), z = at.get(b.target);
    return a && z ? [{ id: `bridge:${b.source}:${b.target}`, points: linkPoints(a, z), rework: false, source: b.source, target: b.target, bridged: true }] : [];
  });
  const edges = [...d.edges.filter((e) => !(e.source && gone.has(e.source)) && !(e.target && gone.has(e.target)))
    .map((e): DrawEdge => ({ ...e, points: e.points.map(([x, y]) => [fx(x), fy(y)] as [number, number]) })),
  ...bridges.filter((b) => !d.edges.some((e) => e.source === b.source && e.target === b.target))];
  const xs = shapes.flatMap((s) => [s.x, s.x + s.w]), ys = shapes.flatMap((s) => [s.y, s.y + s.h]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { box: { x: x0 - PAD, y: y0 - PAD, w: Math.max(...xs) - x0 + 2 * PAD, h: Math.max(...ys) - y0 + 2 * PAD }, shapes, edges };
}
