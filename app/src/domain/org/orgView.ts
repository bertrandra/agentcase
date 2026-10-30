/** @calc-zone process-model */
import { slug } from '../process/ids';
import { without } from '../process/partial';
import { attr, el, kid, kids, NS, text, withChildren, type XDocument, type XElement } from '../process/xml';
import { indent } from '../process/xmlWrite';
import { roleById, providers } from './views';
import type { OrgModel, OrgTeam, OrgUnit } from './types';

/**
 * The diagram "by organisation" of F-B39 (D-B19: the role view stays the default): for one product, the process's lane set becomes
 * units → teams serving the product → roles (nested `childLaneSet`), each activity in the lane of the role that prices it, under the team giving
 * the product the most FTE on that role's team skill; activities whose role no team provides sit in a lane "Not staffed". A role lane names its
 * role resource (`partitionElementRef`, F-B54, B5b); `formalOrganisationView` moves the activity references into the phases. The diagram
 * shapes of the role lanes are dropped (the pool, phases and tasks keep theirs). Computed for an export, never stored.
 */
interface Leaf { unit: OrgUnit; team: OrgTeam; role: string; acts: string[] }
const laneId = (...parts: string[]): string => `lane-org-${parts.map(slug).join('-')}`;

function leaves(m: OrgModel, productId: string): { placed: Leaf[]; loose: string[] } {
  const by = roleById(m), placed: Leaf[] = [], loose: string[] = [];
  for (const a of m.activities) {
    const role = by.get(a.primary ?? a.raci.R[0] ?? ''), best = providers(m, productId, role?.teamSkill).sort((x, y) => y.fte - x.fte)[0];
    if (!role || !best) { loose.push(a.id); continue; }
    const unit = best.unit ?? { id: best.team.unit, name: best.team.unit, type: 'other' as const };
    const at = placed.find((l) => l.team.id === best.team.id && l.role === role.id);
    if (at) at.acts.push(a.id); else placed.push({ unit, team: best.team, role: role.id, acts: [a.id] });
  }
  return { placed, loose };
}

/** The organisation lane set of a product. */
export function organisationLaneSet(m: OrgModel, productId: string): XElement {
  const { placed, loose } = leaves(m, productId), by = roleById(m), refs = (ids: string[]) => ids.map((i) => el('bpmn:flowNodeRef', {}, [text(i)]));
  const units = [...new Map(placed.map((l) => [l.unit.id, l.unit])).values()];
  const lanes = units.map((u) => {
    const teams = [...new Map(placed.filter((l) => l.unit.id === u.id).map((l) => [l.team.id, l.team])).values()];
    return el('bpmn:lane', { id: laneId(u.id), name: u.name }, [el('bpmn:childLaneSet', { id: `${laneId(u.id)}-set` }, teams.map((t) =>
      el('bpmn:lane', { id: laneId(u.id, t.id), name: t.name }, [el('bpmn:childLaneSet', { id: `${laneId(u.id, t.id)}-set` },
        placed.filter((l) => l.team.id === t.id).map((l) => el('bpmn:lane', { id: laneId(u.id, t.id, l.role),
          name: by.get(l.role)?.name ?? l.role, partitionElementRef: l.role }, refs(l.acts))))])))]);
  });
  if (loose.length) lanes.push(el('bpmn:lane', { id: 'lane-org-not-staffed', name: 'Not staffed' }, refs(loose)));
  return el('bpmn:laneSet', { id: 'LaneSet-organisation', name: 'By organisation' }, lanes);
}

/** The document drawn by organisation for a product: the first process's lane set replaced, the role lanes' shapes removed. */
export function organisationView(d: XDocument, m: OrgModel, productId: string): XDocument {
  const proc = kid(d.root, NS.bpmn, 'process');
  if (!proc) return d;
  const old = kid(proc, NS.bpmn, 'laneSet'), laneIds = new Set<string>();
  const collect = (e: XElement): void => {
    for (const c of kids(e)) { if (c.local === 'lane') laneIds.add(attr(c, 'id') ?? ''); collect(c); }
  };
  if (old) collect(old);
  const fresh = indent(organisationLaneSet(m, productId), '  ', 2);
  const proc2 = old ? withChildren(proc, proc.children.map((c) => (c === old ? fresh : c))) : proc;
  const dropShapes = (e: XElement): XElement => withChildren(e, without(e.children, (c) => c.ns === NS.bpmndi && c.local === 'BPMNShape'
    && laneIds.has(attr(c, 'bpmnElement') ?? '')).map((c) => (c.kind === 'element' && c.ns === NS.bpmndi ? dropShapes(c) : c)));
  const root = withChildren(d.root, d.root.children.map((c) => (c === proc ? proc2 : c.kind === 'element' && c.local === 'BPMNDiagram' ? dropShapes(c) : c)));
  return { ...d, root };
}
