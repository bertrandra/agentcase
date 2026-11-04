/** @calc-zone process-model */
import { linkPoints } from './buildDi';
import { findById } from './editMore';
import { appendChild, editById, editWhere } from './editTree';
import { diId } from './ids';
import { readProcess } from './read';
import type { ProcessView } from './readTypes';
import { attr, el, kids, NS, withAttrs, withChildren, type XDocument, type XElement } from './xml';
import { indent } from './xmlWrite';

/** The tree edits shared by the sub-process commands (`editSub.ts`, `editSubDelete.ts`). */
export const PAD = 20;
const HEAD = 30;
export const same = (d: XDocument, root: XElement): XDocument => (root === d.root ? d : { ...d, root });
export type Box = { x: number; y: number; w: number; h: number };
export const boxes = (v: ProcessView): Map<string, Box> => new Map(v.diagram.shapes.map((s) => [s.element, s]));
export const inRework = (v: ProcessView, id: string): boolean => v.flows.some((f) => f.rework && (f.rework.activityA === id || f.rework.activityB === id));

/** The waypoints of the edge of flow `id` redrawn between the shapes of its two ends. */
export function redraw(root: XElement, id: string, a: Box | undefined, b: Box | undefined): XElement {
  if (!a || !b) return root;
  const pts = linkPoints(a, b).map(([x, y]) => el('di:waypoint', { x, y }));
  return editWhere(root, (e) => e.ns === NS.bpmndi && e.local === 'BPMNEdge' && attr(e, 'bpmnElement') === id, (e) => withChildren(e, pts));
}

/** The flows of `container` re-pointed by `map` (an end not in it is kept); a flow that becomes a loop or a duplicate goes with its edge. */
export function repoint(d: XDocument, container: string, map: ReadonlyMap<string, string>): XDocument {
  const v = readProcess(d), seen = new Set<string>(), gone = new Set<string>(), moved: { id: string; s: string; t: string }[] = [];
  for (const f of v.flows.filter((x) => x.container === container && !x.rework)) {
    const s = map.get(f.source) ?? f.source, t = map.get(f.target) ?? f.target, k = `${s}\u0000${t}`;
    if (s === t || seen.has(k)) { gone.add(f.id); continue; }
    seen.add(k);
    if (s !== f.source || t !== f.target) moved.push({ id: f.id, s, t });
  }
  let root = editWhere(d.root, (e) => gone.has(attr(e, 'id') ?? '') || (e.ns === NS.bpmndi && gone.has(attr(e, 'bpmnElement') ?? '')), () => null);
  for (const m of moved) root = editById(root, m.id, (e) => withAttrs(e, { sourceRef: m.s, targetRef: m.t }));
  const out = same(d, root), at = boxes(readProcess(out));
  return same(out, moved.reduce((r, m) => redraw(r, m.id, at.get(m.s), at.get(m.t)), out.root));
}

/** Elements `ids` moved from wherever they are to the end of container `to` (document order kept). */
export function moveInto(d: XDocument, ids: readonly string[], to: string): XDocument {
  const els = ids.map((i) => findById(d.root, i)).filter((e): e is XElement => !!e), set = new Set(ids);
  const root = editWhere(d.root, (e) => set.has(attr(e, 'id') ?? '') && e.ns === NS.bpmn, () => null);
  return same(d, editById(root, to, (c) => els.reduce((acc, e) => appendChild(acc, indent({ ...e }, '  ', 4)), c)));
}

/** The sub-process's shape fitted around its activities' shapes (created when it has none, expanded). */
export function fitShape(d: XDocument, sub: string): XDocument {
  const v = readProcess(d), at = boxes(v), members = v.activities.filter((a) => a.sub === sub).map((a) => at.get(a.id)).filter((b): b is Box => !!b);
  if (!members.length) return d;
  const x = Math.min(...members.map((b) => b.x)) - PAD, y = Math.min(...members.map((b) => b.y)) - HEAD;
  const b = { x, y, width: Math.max(...members.map((m) => m.x + m.w)) + PAD - x, height: Math.max(...members.map((m) => m.y + m.h)) + PAD - y };
  const plane = kids(d.root, NS.bpmndi, 'BPMNDiagram').flatMap((p) => kids(p, NS.bpmndi, 'BPMNPlane'))[0];
  if (!plane) return d;
  const has = kids(plane, NS.bpmndi, 'BPMNShape').some((s) => attr(s, 'bpmnElement') === sub);
  const bounds = el('dc:Bounds', b);
  const root = has
    ? editWhere(d.root, (e) => e.ns === NS.bpmndi && e.local === 'BPMNShape' && attr(e, 'bpmnElement') === sub, (e) => withChildren(e, [bounds]))
    : editById(d.root, attr(plane, 'id') ?? '', (p) => appendChild(p, indent(el('bpmndi:BPMNShape', { id: diId(sub), bpmnElement: sub, isExpanded: 'true' },
      [bounds]), '  ', 3)));
  return same(d, root);
}

