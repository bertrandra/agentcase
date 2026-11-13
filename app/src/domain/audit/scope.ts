/** @calc-zone process-model */
import { isBelow } from '../org/model';
import type { OrgModel, OrgUnit, ProductRef } from '../org/types';
import { byTeam } from '../org/views';

/**
 * The audit scope (owner's request 2026-11-13): what is audited sets what the audit covers. The Portfolio and a Product read the process
 * document as it is (the common process, or the product's case); a shared service (a unit marked `service`) or an organisation unit narrows it
 * to the work of its teams — the in-scope activities its teams perform for the products they serve, and the roles their lines provide —
 * and records what is observed there in its own layer (`unitAuditOf`), read over the document's audit.
 */
export type AuditScopeKind = 'portfolio' | 'product' | 'service' | 'unit';
export interface UnitScope {
  unit: OrgUnit; kind: 'service' | 'unit';
  /** the units counted: the unit and every unit below it */
  units: OrgUnit[];
  /** the in-scope activity ids its teams perform, the role ids their lines provide, the products they serve */
  activities: Set<string>; roles: Set<string>; products: ProductRef[];
}

/** The scope of a unit of the organisation model (null for an unknown unit). */
export function unitScope(m: OrgModel, unitId: string): UnitScope | null {
  const unit = m.units.find((u) => u.id === unitId);
  if (!unit) return null;
  const units = m.units.filter((u) => isBelow(m, u.id, unitId)), ids = new Set(units.map((u) => u.id));
  const activities = new Set<string>(), roles = new Set<string>(), products = new Map<string, ProductRef>();
  for (const t of m.teams.filter((x) => ids.has(x.unit))) {
    const a = byTeam(m, t.id);
    if (!a) continue;
    for (const x of a.activities) activities.add(x.id);
    for (const r of a.roles) roles.add(r.id);
    for (const s of a.serves) products.set(s.product.id, s.product);
  }
  return { unit, kind: unit.service ? 'service' : 'unit', units, activities, roles, products: [...products.values()] };
}

/** The units an audit scope can name: shared services first, then the other units, each in tree order. */
export function scopeUnits(m: Pick<OrgModel, 'units'>): { services: OrgUnit[]; units: OrgUnit[] } {
  return { services: m.units.filter((u) => u.service), units: m.units.filter((u) => !u.service) };
}
