/** @calc-zone process-model */
import type { OrgUnit, ProductRef } from './types';

/**
 * Product ownership over the unit tree (docs/SPEC_BPMN.md § 21, F-B80, D-B39): the tree has no fixed depth; a product points to ONE owning unit at
 * any node (or none: "Unassigned", under the root) and belongs to every ancestor of it for the roll-ups. A unit whose parent is unknown is a root;
 * a cycle from a foreign file is cut where it closes.
 */
export const UNASSIGNED = 'Unassigned';

/** The unit and its ancestors, nearest first (empty for an unknown unit). */
export function unitAncestors(units: readonly OrgUnit[], id: string): OrgUnit[] {
  const byId = new Map(units.map((u) => [u.id, u])), out: OrgUnit[] = [], seen = new Set<string>();
  for (let u = byId.get(id); u && !seen.has(u.id); u = u.parent ? byId.get(u.parent) : undefined) { seen.add(u.id); out.push(u); }
  return out;
}

/** The ids of the unit and of every unit below it, at any depth. */
export function unitDescendants(units: readonly OrgUnit[], id: string): Set<string> {
  const out = new Set<string>([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const u of units) if (u.parent && out.has(u.parent) && !out.has(u.id)) { out.add(u.id); grew = true; }
  }
  return out;
}

/**
 * The products a unit owns directly or through its sub-units (any depth). `null` gives the unassigned products: no owner, or an owner the tree
 * does not hold.
 */
export function productsOfUnit(units: readonly OrgUnit[], products: readonly ProductRef[], id: string | null): ProductRef[] {
  if (id === null) { const known = new Set(units.map((u) => u.id)); return products.filter((p) => !p.owner || !known.has(p.owner)); }
  const below = unitDescendants(units, id);
  return products.filter((p) => !!p.owner && below.has(p.owner));
}
