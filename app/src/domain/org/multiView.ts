/** @calc-zone process-model */
import { withPhaseDiagrams } from '../process/profile/diagrams';
import { CONTAINER_RANK, DEFINITIONS_RANK, fitted, insertChild } from '../process/profile/tree';
import { attr, el, kid, kids, NS, withAttrs, withChildren, type XDocument, type XElement } from '../process/xml';
import { organisationLaneSet } from './orgView';
import type { OrgModel } from './types';

/**
 * One file, several views (spec F-B59, F-B39; phase B5b): the role view stays the first diagram (D-B19), the organisation view of a product is a
 * second lane set of the same process (units → teams → roles) with its own `BPMNDiagram` (every shape of the role view but the role lanes,
 * ids suffixed `_org`), and each phase gets a diagram of its own. Computed for an export, never stored.
 */
const LANE_RANK = (local: string, ns: string): number => (local === 'laneSet' ? 3.5 : CONTAINER_RANK(local, ns));

/** The organisation lane set added to the main process next to the role lanes, and its diagram. */
export function withOrganisationDiagram(d: XDocument, m: OrgModel, productId: string): XDocument {
  const proc = kid(d.root, NS.bpmn, 'process'), dia = kids(d.root, NS.bpmndi, 'BPMNDiagram')[0], plane = dia ? kid(dia, NS.bpmndi, 'BPMNPlane') : undefined;
  if (!proc || !plane) return d;
  const roleLanes = new Set<string>(), collect = (e: XElement): void => {
    for (const c of kids(e)) { if (c.local === 'lane') roleLanes.add(attr(c, 'id') ?? ''); collect(c); }
  };
  for (const s of kids(proc, NS.bpmn, 'laneSet')) collect(s);
  const proc2 = insertChild(proc, fitted(proc, organisationLaneSet(m, productId)), LANE_RANK);
  const items = kids(plane, NS.bpmndi).filter((s) => !roleLanes.has(attr(s, 'bpmnElement') ?? '')).map((s) => withAttrs(s,
    { id: `${attr(s, 'id') ?? ''}_org` }));
  const orgDia = el('bpmndi:BPMNDiagram', { id: 'Diagram_org', name: 'By organisation' }, [
    el('bpmndi:BPMNPlane', { id: 'Plane_org', bpmnElement: attr(plane, 'bpmnElement') }, items)]);
  const root = withChildren(d.root, d.root.children.map((c) => (c === proc ? proc2 : c)));
  return { ...d, root: insertChild(root, fitted(root, orgDia), DEFINITIONS_RANK) };
}

/** The export holding every view: role (first), organisation of a product, one per phase. */
export const allViews = (d: XDocument, m: OrgModel, productId: string): XDocument => withPhaseDiagrams(withOrganisationDiagram(d, m, productId));
