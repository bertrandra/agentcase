/** @calc-zone process-model */
import { editDoc, fitted, insertChild, SUBPROCESS_RANK, type Rank } from '../process/profile/tree';
import { indexOf, refsOf } from '../process/profile/walk';
import { attr, kid, kids, NS, text, withAttrs, withChildren, type XDocument, type XElement } from '../process/xml';
import { organisationView } from './orgView';
import type { OrgModel } from './types';

/**
 * The organisation view of F-B39 made formal BPMN (spec F-B54; phase B5b). A lane partitions the flow nodes of the process that holds its lane
 * set, but AgentCase's activities live inside the phase sub-processes: the process-level lane set "by organisation" keeps the hierarchy unit →
 * team → role (each role lane bound to its role resource by `partitionElementRef`) without activity references, and every phase sub-process gets
 * the same hierarchy restricted to its own activities (lane ids suffixed with the phase), so each `flowNodeRef` points into its own container.
 */
const LANE_SET_RANK: Rank = (local, ns) => (local === 'laneSet' ? 12.5 : SUBPROCESS_RANK(local, ns));

/** The lane set keeping, in each lane, only the references `keep` accepts; lanes left without reference or sub-lane are dropped. */
function pruned(set: XElement, keep: (ref: string) => boolean, suffix: string, dropEmpty: boolean): XElement | null {
  const lanes = kids(set, NS.bpmn, 'lane').map((lane) => {
    const child = kid(lane, NS.bpmn, 'childLaneSet'), sub = child ? pruned(child, keep, suffix, dropEmpty) : null;
    const refs = refsOf(lane, 'flowNodeRef').filter(keep);
    if (dropEmpty && !refs.length && !sub) return null;
    const children = [...refs.map((r) => ({ kind: 'element' as const, ns: NS.bpmn, local: 'flowNodeRef', prefix: lane.prefix, attrs: [],
      children: [text(r)] })),
      ...(sub ? [sub] : [])];
    return withAttrs({ ...lane, children }, { id: `${attr(lane, 'id') ?? ''}${suffix}` });
  }).filter((l): l is XElement => l !== null);
  if (dropEmpty && !lanes.length) return null;
  return withAttrs(withChildren(set, lanes), { id: `${attr(set, 'id') ?? ''}${suffix}` });
}

/** The organisation view of a product with its lane references moved into the phases (see above). */
export function formalOrganisationView(d: XDocument, m: OrgModel, productId: string): XDocument {
  const v = organisationView(d, m, productId), proc = kid(v.root, NS.bpmn, 'process');
  const set = proc ? kids(proc, NS.bpmn, 'laneSet').find((s) => attr(s, 'id') === 'LaneSet-organisation') : undefined;
  if (!proc || !set) return v;
  const ix = indexOf(v.root), phaseOf = (r: string): string | undefined => ix.byId.get(r)?.phase;
  const phases = [...new Set(ix.nodes.map((n) => n.phase).filter((p): p is string => p !== undefined))];
  const top = pruned(set, (r) => phaseOf(r) === undefined || phaseOf(r) === r, '', false) as XElement;
  let out: XDocument = editDoc(v, attr(set, 'id') as string, () => fitted(proc, top));
  for (const p of phases) {
    const own = pruned(set, (r) => phaseOf(r) === p && r !== p, `-${p}`, true);
    if (own) out = editDoc(out, p, (e) => insertChild(e, fitted(e, own), LANE_SET_RANK));
  }
  return out;
}
