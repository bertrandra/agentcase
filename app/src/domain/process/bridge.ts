/** @calc-zone process-model */
import { linkPoints } from './buildDi';
import { appendChild, editById, editWhere } from './editTree';
import { diId, flowId } from './ids';
import { readProcess } from './read';
import type { ProcessView } from './readTypes';
import { attr, el, kids, NS, type XDocument, type XElement } from './xml';
import { indent } from './xmlWrite';

interface Link { source: string; target: string; container: string }

/**
 * The links that keep a chain whole when nodes go (FX-D9): for each plain (not rework) flow P → X with X gone, a link P → S for every node S
 * reached from X through gone nodes only, in X's container. A link that already exists, or that would loop on itself, is left out.
 */
export function bridgesOver(flows: readonly { source: string; target: string; container: string; rework?: unknown }[], gone: ReadonlySet<string>): Link[] {
  const plain = flows.filter((f) => !f.rework), out: Link[] = [], has = new Set(plain.map((f) => `${f.source}\u0000${f.target}`));
  for (const f of plain) {
    if (gone.has(f.source) || !gone.has(f.target)) continue;
    const seen = new Set<string>(), todo = [f.target];
    while (todo.length) {
      const x = todo.pop() as string;
      if (seen.has(x)) continue;
      seen.add(x);
      for (const g of plain) {
        if (g.source !== x) continue;
        if (gone.has(g.target)) { todo.push(g.target); continue; }
        const k = `${f.source}\u0000${g.target}`;
        if (g.target !== f.source && !has.has(k)) { has.add(k); out.push({ source: f.source, target: g.target, container: f.container }); }
      }
    }
  }
  return out;
}

/** `links` appended to their containers as sequence flows, each with an edge between the two shapes when both are drawn (ids kept unique). */
function withLinks(start: XElement, v: ProcessView, links: readonly Link[]): XElement {
  const shapes = new Map(v.diagram.shapes.map((s) => [s.element, s])), ids = new Set(v.flows.map((f) => f.id));
  let root = start;
  for (const b of links) {
    let id = flowId(b.source, b.target);
    for (let n = 2; ids.has(id); n++) id = `${flowId(b.source, b.target)}_${n}`;
    ids.add(id);
    const flow = el('bpmn:sequenceFlow', { id, sourceRef: b.source, targetRef: b.target });
    root = editById(root, b.container, (c) => appendChild(c, indent(flow, '  ', 3)));
    const s = shapes.get(b.source), t = shapes.get(b.target);
    const plane = kids(root, NS.bpmndi, 'BPMNDiagram').flatMap((x) => kids(x, NS.bpmndi, 'BPMNPlane'))[0], planeId = plane && attr(plane, 'id');
    if (!s || !t || !planeId) continue;
    const edge = el('bpmndi:BPMNEdge', { id: diId(id), bpmnElement: id }, linkPoints(s, t).map(([x, y]) => el('di:waypoint', { x, y })));
    root = editById(root, planeId, (p) => appendChild(p, indent(edge, '  ', 3)));
  }
  return root;
}

/**
 * The document with the plain flows that touch a `gone` node removed (with their diagram edges) and the chain bridged over them: one sequence flow
 * per `bridgesOver` link, appended to its container, with an edge between the two shapes when both are drawn. Rework flows are left to the caller.
 * The gone nodes themselves stay (the caller removes or moves them).
 */
export function bridgeOver(d: XDocument, gone: ReadonlySet<string>): XDocument {
  const v = readProcess(d), touching = v.flows.filter((f) => !f.rework && (gone.has(f.source) || gone.has(f.target)));
  if (!touching.length) return d;
  const drop = new Set(touching.flatMap((f) => [f.id, diId(f.id)]));
  let root = editWhere(d.root, (e) => drop.has(attr(e, 'id') ?? '') || (e.ns === NS.bpmndi && drop.has(attr(e, 'bpmnElement') ?? '')), () => null);
  root = withLinks(root, v, bridgesOver(v.flows, gone));
  return root === d.root ? d : { ...d, root };
}

/**
 * `process.linkActivities` (FX-D9): every SDLC activity of a phase (not ad hoc) that no plain flow touches yet is linked: appended after the end
 * of the phase's chain (its activity with incoming but no outgoing link), or chained with the others when the phase has none, in their order
 * (regulatory activities are the phase's obligations: not chained). So a document written before the links gets them, and an activity added or moved since joins its phase's chain. The same document
 * when every activity is linked.
 */
export function linkActivities(d: XDocument): XDocument {
  const v = readProcess(d), plain = v.flows.filter((f) => !f.rework), out: Link[] = [];
  const from = new Set(plain.map((f) => f.source)), to = new Set(plain.map((f) => f.target));
  for (const p of v.phases) {
    if (p.adHoc) continue;
    const acts = v.activities.filter((a) => a.phase === p.id && a.trigger === undefined && !a.regulatory).sort((a, b) => a.order - b.order);
    const loose = acts.filter((a) => !from.has(a.id) && !to.has(a.id)).map((a) => a.id);
    const tail = acts.find((a) => to.has(a.id) && !from.has(a.id))?.id, ids = tail ? [tail, ...loose] : loose;
    if (!loose.length) continue;
    ids.slice(1).forEach((x, i) => out.push({ source: ids[i] ?? '', target: x, container: p.id }));
  }
  if (!out.length) return d;
  return { ...d, root: withLinks(d.root, v, out) };
}
