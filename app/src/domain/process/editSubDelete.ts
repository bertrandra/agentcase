/** @calc-zone process-model */
import { linkPoints } from './buildDi';
import { boxes, moveInto, redraw, same } from './editSubTree';
import { appendChild, editById, editWhere } from './editTree';
import { diId } from './ids';
import { readProcess } from './read';
import { attr, el, kids, NS, withAttrs, type XDocument } from './xml';
import { indent } from './xmlWrite';

/** `process.deleteSubProcess`: its activities and flows back in the phase; a link to it goes to its first activities, one from it leaves its last. */
export function deleteSubProcess(d: XDocument, sub: string): XDocument {
  const v = readProcess(d), s = v.subProcesses?.find((x) => x.id === sub);
  if (!s) return d;
  const members = v.activities.filter((a) => a.sub === sub).map((a) => a.id), inner = v.flows.filter((f) => f.container === sub);
  const firsts = members.filter((m) => !inner.some((f) => !f.rework && f.target === m));
  const lasts = members.filter((m) => !inner.some((f) => !f.rework && f.source === m));
  let out = moveInto(d, [...members, ...inner.map((f) => f.id)], s.phase);
  out = same(out, editWhere(out.root, (e) => attr(e, 'id') === sub || (e.ns === NS.bpmndi && attr(e, 'bpmnElement') === sub), () => null));
  // the inherited links: one per first (incoming) or last (outgoing) activity
  const outer = readProcess(d).flows.filter((f) => f.container === s.phase && !f.rework && (f.source === sub || f.target === sub));
  const at = boxes(readProcess(out));
  let root = out.root;
  for (const f of outer) {
    const ends = f.target === sub ? firsts : lasts, [first, ...more] = ends;
    if (!first) { root = editWhere(root, (e) => attr(e, 'id') === f.id || (e.ns === NS.bpmndi && attr(e, 'bpmnElement') === f.id), () => null); continue; }
    const ref = (m: string) => (f.target === sub ? { sourceRef: f.source, targetRef: m } : { sourceRef: m, targetRef: f.target });
    root = editById(root, f.id, (e) => withAttrs(e, ref(first)));
    root = redraw(root, f.id, at.get(f.target === sub ? f.source : first), at.get(f.target === sub ? first : f.target));
    for (const m of more) {
      const nid = `${f.id}_${m}`, r = ref(m);
      root = editById(root, s.phase, (p) => appendChild(p, indent(el('bpmn:sequenceFlow', { id: nid, ...r }), '  ', 3)));
      const plane = kids(root, NS.bpmndi, 'BPMNDiagram').flatMap((x) => kids(x, NS.bpmndi, 'BPMNPlane'))[0], a = at.get(r.sourceRef), b = at.get(r.targetRef);
      if (!plane || !a || !b) continue;
      const edge = el('bpmndi:BPMNEdge', { id: diId(nid), bpmnElement: nid }, linkPoints(a, b).map(([x, y]) => el('di:waypoint', { x, y })));
      root = editById(root, attr(plane, 'id') ?? '', (p) => appendChild(p, indent(edge, '  ', 3)));
    }
  }
  return same(out, root);
}

/** The sub-processes left without an activity (their last one removed or moved away), deleted. */
export function withoutEmptySubs(d: XDocument): XDocument {
  const v = readProcess(d), empty = (v.subProcesses ?? []).filter((s) => !v.activities.some((a) => a.sub === s.id));
  return empty.reduce((acc, s) => deleteSubProcess(acc, s.id), d);
}

