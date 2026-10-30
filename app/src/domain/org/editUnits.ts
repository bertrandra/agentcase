/** @calc-zone process-model */
import { appendChild, idsOf } from '../process/editTree';
import { ID_PATTERN } from '../process/security';
import { attr, el, kid, kids, NS, text, withAttrs, withChildren, type AttrInput, type XDocument, type XElement } from '../process/xml';
import { indent } from '../process/xmlWrite';
import { isBelow } from './model';
import { readStoredOrg } from './readUnits';
import { DEFAULT_UNIT_ID } from './teams';
import type { OrgUnit } from './types';

/**
 * Commands on the organisation units (§ 16.3, § 16.6): `ac:orgUnit` elements in the extension elements of the document's collaboration. A new
 * unit is appended at the end of that list (the undo patch is the new element). The derived default delivery unit is written into the document the
 * first time it is edited or used as a parent. Each function returns the same document when the change is refused.
 */
export type UnitInput = Omit<OrgUnit, 'derived'>;
export type UnitPatch = Partial<Omit<OrgUnit, 'id' | 'derived'>>;
const same = (d: XDocument, root: XElement): XDocument => (root === d.root ? d : { ...d, root });
const unitAttrs = (u: UnitInput): AttrInput => ({ id: u.id, name: u.name.trim(), type: u.type, parent: u.parent || null, location: u.location || null,
  costCentre: u.costCentre || null, sourcing: u.sourcing || null });

/** The collaboration with an `ac:orgUnit` appended to its extension elements (created after any documentation when absent). */
function withUnitElement(c: XElement, unit: XElement): XElement {
  const ext = kid(c, NS.bpmn, 'extensionElements');
  if (ext) return withChildren(c, c.children.map((x) => (x === ext ? appendChild(ext, unit) : x)));
  const fresh = indent(el('bpmn:extensionElements', {}, [unit]), '  ', 2);
  const at = c.children.findIndex((x) => x.kind === 'element' && x.local !== 'documentation');
  if (at < 0) return withChildren(c, [...c.children, text('\n    '), fresh, text('\n  ')]);
  return withChildren(c, [...c.children.slice(0, at), fresh, text('\n    '), ...c.children.slice(at)]);
}
function onCollaboration(d: XDocument, fn: (c: XElement) => XElement): XDocument {
  const c = kid(d.root, NS.bpmn, 'collaboration');
  return c ? same(d, withChildren(d.root, d.root.children.map((x) => (x === c ? fn(c) : x)))) : d;
}
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
  return onCollaboration(doc, (c) => withUnitElement(c, el('ac:orgUnit', unitAttrs(u))));
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
  return onCollaboration(d, (c) => {
    const ext = kid(c, NS.bpmn, 'extensionElements');
    if (!ext) return c;
    return withChildren(c, c.children.map((x) => (x !== ext ? x : withChildren(ext, ext.children.map((u) =>
      (u.kind === 'element' && u.ns === NS.ac && u.local === 'orgUnit' && attr(u, 'id') === id ? withAttrs(u, a) : u))))));
  });
}

/** Remove a unit; refused while another unit names it as parent. The default delivery unit goes back to its derived form. */
export function removeUnit(d: XDocument, id: string): XDocument {
  const units = readStoredOrg(d).units;
  if (!units.some((u) => u.id === id) || units.some((u) => u.parent === id)) return d;
  return onCollaboration(d, (c) => {
    const ext = kid(c, NS.bpmn, 'extensionElements');
    if (!ext) return c;
    const cs = ext.children, i = cs.findIndex((u) => u.kind === 'element' && u.local === 'orgUnit' && attr(u, 'id') === id);
    const from = i > 0 && cs[i - 1]?.kind === 'text' && !(cs[i - 1] as { text: string }).text.trim() ? i - 1 : i;
    const rest = [...cs.slice(0, from), ...cs.slice(i + 1)];
    if (kids({ ...ext, children: rest }).length) return withChildren(c, c.children.map((x) => (x === ext ? withChildren(ext, rest) : x)));
    const j = c.children.indexOf(ext), after = c.children[j + 1];   // the last element left: the extension elements go, with the white space after them
    return withChildren(c, [...c.children.slice(0, j), ...c.children.slice(after?.kind === 'text' && !after.text.trim() ? j + 2 : j + 1)]);
  });
}
