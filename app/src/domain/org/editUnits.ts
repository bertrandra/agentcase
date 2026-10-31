/** @calc-zone process-model */
import { idsOf } from '../process/editTree';
import { ID_PATTERN } from '../process/security';
import { attr, el, NS, withAttrs, type AttrInput, type XDocument, type XElement, type XNode } from '../process/xml';
import { DEFAULT_UNIT_ID } from './ids';
import { isBelow } from './model';
import { onCollaboration, onExtChildren, withExtChild, withoutChildren } from './orgExt';
import { readStoredOrg } from './readUnits';
import { isStoredTeam, storedTeams } from './teamDoc';
import type { OrgUnit } from './types';

/**
 * Commands on the organisation units (§ 16.3, § 16.6): `ac:orgUnit` elements in the extension elements of the document's collaboration. A new
 * unit is appended at the end of that list (the undo patch is the new element). The derived default delivery unit is written into the document the
 * first time it is edited or used as a parent. Each function returns the same document when the change is refused.
 */
export type UnitInput = Omit<OrgUnit, 'derived'>;
export type UnitPatch = Partial<Omit<OrgUnit, 'id' | 'derived'>>;
const unitAttrs = (u: UnitInput): AttrInput => ({ id: u.id, name: u.name.trim(), type: u.type, parent: u.parent || null, location: u.location || null,
  costCentre: u.costCentre || null, sourcing: u.sourcing || null });
const stored = (d: XDocument, id: string): boolean => readStoredOrg(d).units.some((u) => u.id === id);

/** A free unit id of the document (`unit-1`, `unit-2`…). */
export function freeUnitId(d: XDocument): string {
  const used = idsOf(d.root);
  let i = 1;
  while (used.has(`unit-${i}`)) i++;
  return `unit-${i}`;
}

/** Add a unit; refused for a blank name, an id already used in the document or not a safe id, an unknown parent, a document without collaboration. */
export function addUnit(d: XDocument, u: UnitInput, defaultUnit?: UnitInput): XDocument {
  if (!u.name.trim() || !ID_PATTERN.test(u.id) || idsOf(d.root).has(u.id)) return d;
  let doc = d;
  if (u.parent === DEFAULT_UNIT_ID && !stored(d, DEFAULT_UNIT_ID) && defaultUnit) doc = addUnit(d, defaultUnit);
  if (u.parent && !stored(doc, u.parent)) return d;
  return onCollaboration(doc, (c) => withExtChild(c, el('ac:orgUnit', unitAttrs(u)), isStoredTeam));   // before the stored teams (B10a)
}

/** Change a unit's fields; refused for a blank name or a parent that is unknown or below the unit itself (no cycle). */
export function updateUnit(d: XDocument, id: string, patch: UnitPatch, defaultUnit?: UnitInput): XDocument {
  if (patch.name !== undefined && !patch.name.trim()) return d;
  if (id === DEFAULT_UNIT_ID && !stored(d, id)) {
    if (!defaultUnit) return d;
    const withDefault = addUnit(d, defaultUnit), next = withDefault === d ? d : updateUnit(withDefault, id, patch);
    return next === withDefault ? d : next;
  }
  if (patch.parent === DEFAULT_UNIT_ID && !stored(d, DEFAULT_UNIT_ID) && defaultUnit && stored(d, id)) {
    const withDefault = addUnit(d, defaultUnit), next = updateUnit(withDefault, id, patch);
    return next === withDefault ? d : next;
  }
  const units = readStoredOrg(d).units;
  if (!units.some((u) => u.id === id)) return d;
  if (patch.parent && (!units.some((u) => u.id === patch.parent) || isBelow({ units }, patch.parent, id))) return d;
  const a: AttrInput = {};
  for (const k of ['name', 'type', 'parent', 'location', 'costCentre', 'sourcing'] as const) {
    if (k in patch) a[k] = k === 'name' ? patch.name!.trim() : patch[k] || null;
  }
  return onCollaboration(d, (c) => onExtChildren(c, (cs) => cs.map((u) => (isUnit(u, id) ? withAttrs(u, a) : u))));
}

const isUnit = (u: XNode, id: string): u is XElement => u.kind === 'element' && u.ns === NS.ac && u.local === 'orgUnit' && attr(u, 'id') === id;
/** True while a product's team or ownership (schema v5) names the unit. */
function inUse(d: XDocument, id: string): boolean {
  const t = storedTeams(d);
  return [...t.own.values(), ...t.shared].some((e) => attr(e, 'unit') === id || attr(e, 'owner') === id);
}

/**
 * Remove a unit; refused while another unit names it as parent or a team or a product's ownership names it (D-B39). The default delivery unit
 * goes back to its derived form.
 */
export function removeUnit(d: XDocument, id: string): XDocument {
  const units = readStoredOrg(d).units;
  if (!units.some((u) => u.id === id) || units.some((u) => u.parent === id) || (id !== DEFAULT_UNIT_ID && inUse(d, id))) return d;
  return onCollaboration(d, (c) => onExtChildren(c, (cs) => withoutChildren(cs, (u) => isUnit(u, id))));
}
