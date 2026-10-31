/** @calc-zone process-model */
import type { SharedTeamLine } from '../portfolio/types';
import { DEFAULT_UNIT_ID } from './ids';
import type { ActivityRaci, OrgUnit, ServiceSpec } from './types';

/**
 * Transverse services (docs/SPEC_BPMN.md § 21 F-B82, phase B10c): THE owner of "what a service does for a product". A shared service is an
 * organisation unit marked `service` (its activity types and roles, `ServiceSpec`); the shared team lines of that unit are its lines. For one
 * product, the service performs every active activity of the product that is
 * - **pinned** on one of its lines (the pins of a shared line, B10a / lot 7),
 * - of one of its **activity types** (the activity's team skill, e.g. every Test/QA activity), or
 * - one where one of its **roles** is RACI **Responsible** (§ 16).
 * The effort of an activity is its engine weight (`w`: effort × lifecycle weight), so the service's effort for a product is a share of the
 * product's own scope weight. An activity can be assigned to more than one service (each counts it). Pure.
 */
export type Via = 'pin' | 'type' | 'role';
export interface ServiceActivity { id: string; name: string; phase: string; effort: number; via: Via[] }
export interface ServiceDef { id: string; name: string; spec: ServiceSpec; lines: SharedTeamLine[] }

/** The unit a shared line belongs to (absent = the default delivery unit). */
export const lineUnit = (l: Pick<SharedTeamLine, 'unit'>): string => l.unit ?? DEFAULT_UNIT_ID;

/** The shared services of an organisation: its units marked `service`, in tree order of `units`, each with its shared lines (document order). */
export function serviceDefs(units: readonly OrgUnit[], lines: readonly SharedTeamLine[]): ServiceDef[] {
  return units.filter((u) => u.service).map((u) => ({ id: u.id, name: u.name, spec: u.service!, lines: lines.filter((l) => lineUnit(l) === u.id) }));
}

/** An active activity of a product as the engine weighs it (`w`: effort × lifecycle weight). */
export interface WorkActivity { id: string; name: string; phase: string; w: number }
/** What a product gives to read: its active activities, the team skill of each (its activity type) and the RACI of its process. */
export interface ProductWork { active: readonly WorkActivity[]; teamSkill: (a: WorkActivity) => string; raci: readonly ActivityRaci[] }

/** The activities a service performs for one product, in the product's activity order, with why each one is assigned. */
export function serviceActivities(def: Pick<ServiceDef, 'spec' | 'lines'>, work: ProductWork): ServiceActivity[] {
  const pins = new Set(def.lines.flatMap((l) => l.pins ?? [])), skills = new Set(def.spec.skills), roles = new Set(def.spec.roles);
  const rOf = new Map<string, string[]>();
  if (roles.size) for (const a of work.raci) rOf.set(a.id, a.raci.R);
  const out: ServiceActivity[] = [];
  for (const a of work.active) {
    const via: Via[] = [];
    if (pins.has(a.id)) via.push('pin');
    if (skills.size && skills.has(work.teamSkill(a))) via.push('type');
    if ((rOf.get(a.id) ?? []).some((r) => roles.has(r))) via.push('role');
    if (via.length) out.push({ id: a.id, name: a.name, phase: a.phase, effort: +a.w || 0, via });
  }
  return out;
}

/** Σ effort of a list of activities. */
export const effortOf = (acts: readonly { effort: number }[]): number => acts.reduce((s, a) => s + a.effort, 0);

/**
 * D-B38 (a): the split of a service across products by the effort of its activities for each, in percent (products with no effort get none). Every
 * share is effort / Σ effort × 100, so the shares add up to 100 % (to rounding) and the line's FTE and cost are handed out exactly once. No effort
 * anywhere: no share (the line serves nobody, a diagnostic of the Services view).
 */
export function effortSplit(effort: ReadonlyMap<string, number>): Record<string, number> {
  const total = [...effort.values()].reduce((s, x) => s + (x > 0 ? x : 0), 0), out: Record<string, number> = {};
  if (total <= 0) return out;
  for (const [id, e] of effort) if (e > 0) out[id] = (e / total) * 100;
  return out;
}
