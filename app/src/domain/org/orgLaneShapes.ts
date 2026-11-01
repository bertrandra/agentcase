/** @calc-zone process-model */
import { attr, el, kid, kids, NS, type XElement } from '../process/xml';

/**
 * The geometry of the organisation lanes (SPEC_FIXES FX-23, F-B39): the lane set unit → team → role laid as horizontal bands inside the pool,
 * one band of equal height per role lane, a team spanning its roles and a unit its teams, each level indented by 30 px like a nested lane.
 * `pool`: the bounds of the participant's shape (or of every shape when there is no pool). Returns the `bpmndi:BPMNShape`s of every lane.
 */
export interface Box { x: number; y: number; w: number; h: number }
const INDENT = 30;
const lanesOf = (e: XElement): XElement[] => kids(kid(e, NS.bpmn, 'childLaneSet') ?? { ...e, children: [] }, NS.bpmn, 'lane');
const leaves = (lane: XElement): number => { const sub = lanesOf(lane); return sub.length ? sub.reduce((s, l) => s + leaves(l), 0) : 1; };

export function orgLaneShapes(set: XElement, pool: Box, suffix = ''): XElement[] {
  const top = kids(set, NS.bpmn, 'lane'), total = top.reduce((s, l) => s + leaves(l), 0) || 1, unit = pool.h / total, out: XElement[] = [];
  const place = (lanes: XElement[], x: number, y0: number): void => {
    let y = y0;
    for (const l of lanes) {
      const h = leaves(l) * unit, id = attr(l, 'id') ?? '';
      out.push(el('bpmndi:BPMNShape', { id: `${id}_di${suffix}`, bpmnElement: id, isHorizontal: 'true' },
        [el('dc:Bounds', { x: Math.round(x), y: Math.round(y), width: Math.round(pool.x + pool.w - x), height: Math.round(h) })]));
      place(lanesOf(l), x + INDENT, y);
      y += h;
    }
  };
  place(top, pool.x + INDENT, pool.y);
  return out;
}

/** The bounds of a shape (`dc:Bounds`), or null. */
export function boundsOf(shape: XElement): Box | null {
  const b = kid(shape, NS.dc, 'Bounds'), n = (k: string) => Number(b ? attr(b, k) : NaN);
  const box = { x: n('x'), y: n('y'), w: n('width'), h: n('height') };
  return [box.x, box.y, box.w, box.h].every(Number.isFinite) ? box : null;
}
