/** @calc-zone process-model */
import { readBpsim } from './bpsim';
import { activitiesOf, flowsIn, phasesOf, type Sim } from './readPhases';
import { boundaryReworksIn, withTargets } from './readRework';
import { bpsimReworksIn } from './profile/bpsimRework';
import { loopIterations, withProfile } from './profile/readHook';
import { bool, extOf, marks, num, type ActorView, type DiagramView, type NormView, type ProcessParams, type ProcessView } from './readTypes';
import { attr, kid, kids, NS, type XDocument, type XElement } from './xml';

export type { ActivityView, ActorView, DiagramView, FlowView, NormView, PhaseView, ProcessView } from './readTypes';
const str = (v: string | undefined): string => v ?? '';

function actorsOf(defs: XElement, sim: Sim): ActorView[] {
  return kids(defs, NS.bpmn, 'resource').map((e) => {
    const x = extOf(e, 'actor'), a = (n: string) => (x ? attr(x, n) : undefined);
    const v: ActorView = { id: str(attr(e, 'id')), name: str(attr(e, 'name')), kind: a('kind') ?? 'role', regulatory: a('regulatory') === 'true' };
    const ts = a('teamSkill'), cap = a('capability'), q = sim.get(v.id)?.quantity;
    if (ts !== undefined) v.teamSkill = ts;
    if (q !== undefined) v.quantity = q;
    if (cap !== undefined) v.capability = cap;
    return v;
  });
}

function normsOf(defs: XElement): NormView[] {
  return kids(defs, NS.bpmn, 'category').flatMap((c) => kids(c, NS.bpmn, 'categoryValue').map((e) => {
    const x = extOf(e, 'norm'), body = x ? attr(x, 'body') : undefined, scope = x ? attr(x, 'scope') : undefined;
    const v: NormView = { id: str(attr(e, 'id')), industry: str(attr(c, 'name')), name: str(attr(e, 'value')),
      count: num(x ? attr(x, 'count') : undefined) ?? 0, ...marks(e, x, 'scopeRank') };
    if (body !== undefined) v.body = body;
    if (scope !== undefined) v.scope = scope;
    return v;
  }));
}

/** The shapes and edges of the first diagram (the role view; further diagrams of the file are other views, F-B59). */
function diagramOf(defs: XElement): DiagramView {
  const plane = kids(defs, NS.bpmndi, 'BPMNDiagram').slice(0, 1).flatMap((d) => kids(d, NS.bpmndi, 'BPMNPlane'));
  const n = (e: XElement | undefined, k: string): number => num(e ? attr(e, k) : undefined) ?? 0;
  return {
    shapes: plane.flatMap((p) => kids(p, NS.bpmndi, 'BPMNShape')).map((e) => {
      const b = kid(e, NS.dc, 'Bounds');
      return { id: str(attr(e, 'id')), element: str(attr(e, 'bpmnElement')), x: n(b, 'x'), y: n(b, 'y'), w: n(b, 'width'), h: n(b, 'height'),
        expanded: attr(e, 'isExpanded') === 'true' };
    }),
    edges: plane.flatMap((p) => kids(p, NS.bpmndi, 'BPMNEdge')).map((e) => ({ id: str(attr(e, 'id')), element: str(attr(e, 'bpmnElement')),
      points: kids(e, NS.di, 'waypoint').map((w): [number, number] => [n(w, 'x'), n(w, 'y')]) })),
  };
}

function paramsOf(proc: XElement | undefined): ProcessParams {
  const x = proc ? extOf(proc, 'process') : undefined, out: ProcessParams = { unmatched: [] };
  if (!x) return out;
  for (const k of ['caseSchema', 'sdlcEdits', 'regEdits', 'rampSeq', 'skillMap'] as const) { const v = attr(x, k); if (v !== undefined) out[k] = v; }
  const ri = bool(attr(x, 'regInclude'));
  if (ri !== undefined) out.regInclude = ri;
  out.unmatched = kids(x, NS.ac, 'unmatched').map((u) => ({ list: str(attr(u, 'list')), rank: num(attr(u, 'rank')) ?? 0, value: str(attr(u, 'value')) }));
  return out;
}

const memo = new WeakMap<XDocument, ProcessView>();
/**
 * The typed views of a process document: phases, activities, actors, flows, norms and diagram. Memoised on the document's identity, so an
 * unchanged tree is read once; an edit produces a new tree and a new read. Reads the first `bpmn:process` of the definitions.
 */
export function readProcess(d: XDocument): ProcessView {
  const hit = memo.get(d);
  if (hit) return hit;
  const defs = d.root, proc = kid(defs, NS.bpmn, 'process'), phases = proc ? phasesOf(proc) : [], sim = readBpsim(defs);
  const flows = (proc ? [...flowsIn(proc, sim), ...phases.flatMap((p) => flowsIn(p.el, sim))] : []).map((f) => {
    const r = f.rework, n = r ? loopIterations(defs, f.id, r.internalIterations, r.activityB || r.activityA || undefined) : 0;
    return r && n !== r.internalIterations ? { ...f, rework: { ...r, internalIterations: n } } : f;
  });
  const containers = proc ? [proc, ...phases.map((p) => p.el)] : [];
  const reworks = withTargets(containers.flatMap((c) => [...boundaryReworksIn(c), ...bpsimReworksIn(c, flows, sim)]), flows)
    .map((b) => ({ ...b, internalIterations: loopIterations(defs, b.id, b.internalIterations, b.activityB ?? b.attachedTo) }));
  const view: ProcessView = {
    params: paramsOf(proc), phases: phases.map((p) => p.view), activities: withProfile(defs, proc, phases, phases.flatMap((p) => activitiesOf(p.el, sim)), sim),
    actors: actorsOf(defs, sim), flows, reworks, norms: normsOf(defs), diagram: diagramOf(defs),
  };
  memo.set(d, view);
  return view;
}
