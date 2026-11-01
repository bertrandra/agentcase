/** @calc-zone process-model */
import { attr, el, kids, NS, type XDocument, type XElement } from '../process/xml';
import { onCollaboration, onExtChildren, orgExtOf, withExtChild, withoutChildren } from './orgExt';
import { isStoredTeam } from './teamDoc';

/**
 * The operating-model roles of the transformation programme mapped to organisation roles (SPEC_FIXES FX-D11 (a), § 19.9, § 19.13):
 * `ac:laneRole lane="orchestrator" role="role-lead"` in the organisation part of the common document. A programme lane then names the role (and so
 * its team skill) that staffs it — the build pods and run teams of SPEC_HARNESS start from it. No figure reads it.
 */
const isLaneRole = (e: XElement): boolean => e.ns === NS.ac && e.local === 'laneRole';
const KEY = /^[A-Za-z0-9_.:-]{1,80}$/;

/** Lane (operating-model role key) → organisation role id. */
export function laneRolesOf(common: XDocument | undefined): Map<string, string> {
  const x = orgExtOf(common), out = new Map<string, string>();
  for (const e of x ? kids(x, NS.ac, 'laneRole') : []) { const l = attr(e, 'lane'), r = attr(e, 'role'); if (l && r) out.set(l, r); }
  return out;
}

/** The common document with a lane mapped to a role (`roleId`) or unmapped (null). `known`: the role ids it may name. */
export function withLaneRole(common: XDocument, lane: string, roleId: string | null, known: ReadonlySet<string>): XDocument {
  if (!KEY.test(lane) || (roleId !== null && !known.has(roleId)) || (laneRolesOf(common).get(lane) ?? null) === roleId) return common;
  const out = onCollaboration(common, (c) => onExtChildren(c, (cs) => withoutChildren(cs, (e) => isLaneRole(e) && attr(e, 'lane') === lane)));
  return roleId === null ? out : onCollaboration(out, (c) => withExtChild(c, el('ac:laneRole', { lane, role: roleId }), isStoredTeam));
}
