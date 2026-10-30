/** @calc-zone process-model */
import { appendChild, editById, editWhere, idsOf, withExt } from './editTree';
import { dataId, diId } from './ids';
import { readProcess } from './read';
import { attr, el, kids, NS, withAttrs, withChildren, type XDocument, type XElement } from './xml';
import { indent } from './xmlWrite';

/**
 * Process commands of phase B4 on the structure and the diagram (spec § 9: `process.moveActivity`, `setReworkFlow`, `setDiagram`). Each returns the
 * same document when the change is refused (unknown id, a rework pair, a value out of range), so the store adds no undo step.
 */
const same = (d: XDocument, root: XElement): XDocument => (root === d.root ? d : { ...d, root });

/** The element with this id (depth first), or undefined. */
export function findById(e: XElement, id: string): XElement | undefined {
  for (const c of e.children) {
    if (c.kind !== 'element') continue;
    if (attr(c, 'id') === id) return c;
    const hit = findById(c, id);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * `process.moveActivity`: the activity (and its deliverable) moves to the end of another phase; the sequence flows that touched it in its old phase
 * and its diagram shape go (the layout places it in the new phase). Refused while it belongs to a rework pair (the loop would cross phases).
 */
export function moveActivity(d: XDocument, id: string, phase: string): XDocument {
  const v = readProcess(d), a = v.activities.find((x) => x.id === id);
  if (!a || a.phase === phase || !v.phases.some((p) => p.id === phase)) return d;
  if (v.flows.some((f) => f.rework && (f.rework.activityA === id || f.rework.activityB === id))) return d;
  const task = findById(d.root, id), data = findById(d.root, dataId(id));
  if (!task) return d;
  const flows = new Set(v.flows.filter((f) => !f.rework && (f.source === id || f.target === id)).map((f) => f.id));
  const gone = new Set([id, dataId(id), ...flows]), shapes = new Set([...gone].map(diId));
  let root = editWhere(d.root, (e) => gone.has(attr(e, 'id') ?? '') || shapes.has(attr(e, 'id') ?? ''), () => null);
  const moved = withExt(task, 'activity', { phase });
  root = editById(root, phase, (ph) => {
    const one = appendChild(ph, moved);
    return data ? appendChild(one, data) : one;
  });
  return same(d, root);
}

/** What `setReworkFlow` may change on a rework flow (`ac:rework`): probability and cost share in [0, 1], internal iterations ≥ 0. */
export interface ReworkPatch { probability?: number; costShare?: number; internalIterations?: number; note?: string }
const share = (n: number | undefined): boolean => n === undefined || (Number.isFinite(n) && n >= 0 && n <= 1);

/** `process.setReworkFlow`: the parameters of an existing rework flow (by flow id). */
export function setReworkFlow(d: XDocument, flow: string, p: ReworkPatch): XDocument {
  if (!readProcess(d).flows.some((f) => f.id === flow && f.rework)) return d;
  const it = p.internalIterations;
  if (!share(p.probability) || !share(p.costShare) || (it !== undefined && !(Number.isInteger(it) && it >= 0))) return d;
  const patch = Object.fromEntries(Object.entries({ probability: p.probability, costShare: p.costShare, internalIterations: it, note: p.note })
    .filter(([, v]) => v !== undefined));   // an absent field is left as it is (undefined would remove the attribute)
  return same(d, editById(d.root, flow, (e) => withExt(e, 'rework', patch)));
}

/** A position of an element on the diagram (BPMN DI bounds). */
export interface Bounds { x: number; y: number; w: number; h: number }
const ok = (b: Bounds): boolean => [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w > 0 && b.h > 0;
const boundsAttrs = (b: Bounds) => ({ x: b.x, y: b.y, width: b.w, height: b.h });

/**
 * `process.setDiagram`: the bounds of an element's shape on the first diagram plane. A shape that exists is moved in place (its `dc:Bounds`); an
 * element without one (an activity added in AgentCase, placed by the layout until then) gets a shape appended at the end of the plane.
 */
export function setDiagram(d: XDocument, element: string, b: Bounds): XDocument {
  const plane = kids(d.root, NS.bpmndi, 'BPMNDiagram').flatMap((x) => kids(x, NS.bpmndi, 'BPMNPlane'))[0], planeId = plane && attr(plane, 'id');
  if (!plane || !planeId || !ok(b) || !findById(d.root, element)) return d;
  const shape = kids(plane, NS.bpmndi, 'BPMNShape').find((s) => attr(s, 'bpmnElement') === element);
  if (shape) {
    const sid = attr(shape, 'id') ?? '';
    return same(d, editById(d.root, sid, (s) => withChildren(s, s.children.map((c) => (c.kind === 'element' && c.ns === NS.dc && c.local === 'Bounds'
      ? withAttrs(c, boundsAttrs(b)) : c)))));
  }
  const sid = diId(element);
  if (idsOf(d.root).has(sid)) return d;
  const fresh = indent(el('bpmndi:BPMNShape', { id: sid, bpmnElement: element }, [el('dc:Bounds', boundsAttrs(b))]), '  ', 3);
  return same(d, editById(d.root, planeId, (p) => appendChild(p, fresh)));
}
