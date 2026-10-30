/** @calc-zone process-model */
import { isBelow } from './model';
import { teamsServing } from './teams';
import type { ActivityRaci, OrgModel, OrgRole, OrgTeam, OrgUnit, ProductRef } from './types';
import { byTeam, roleById } from './views';

/** "Who does what" (F-B38), the answers by organisation unit and by product (its organisation chart and its RACI matrix). */
export interface Bucket { key: string; fte: number }
const bucket = (m: Map<string, number>): Bucket[] => [...m].map(([key, fte]) => ({ key, fte })).sort((a, b) => b.fte - a.fte || a.key.localeCompare(b.key));

export interface UnitAnswer {
  unit: OrgUnit; units: OrgUnit[]; teams: OrgTeam[]; products: ProductRef[]; activities: number; fte: number; byLocation: Bucket[]; byGrade: Bucket[];
}
/** A unit with the units below it: their teams, the products they serve, the activities performed, FTE by location and by grade. */
export function byUnit(m: OrgModel, unitId: string): UnitAnswer | null {
  const unit = m.units.find((u) => u.id === unitId);
  if (!unit) return null;
  const units = m.units.filter((u) => isBelow(m, u.id, unitId)), ids = new Set(units.map((u) => u.id));
  const teams = m.teams.filter((t) => ids.has(t.unit)), loc = new Map<string, number>(), grade = new Map<string, number>();
  const products = m.products.filter((p) => teams.some((t) => t.serves.some((s) => s.productId === p.id && s.pct > 0)));
  const acts = new Set<ActivityRaci>();
  let fte = 0;
  for (const t of teams) {
    for (const l of t.lines) {
      const e = +l.etp || 0;
      fte += e; loc.set(l.loc, (loc.get(l.loc) ?? 0) + e); grade.set(l.grade, (grade.get(l.grade) ?? 0) + e);
    }
    for (const a of byTeam(m, t.id)?.activities ?? []) acts.add(a);
  }
  return { unit, units, teams, products, activities: acts.size, fte, byLocation: bucket(loc), byGrade: bucket(grade) };
}

export interface ChartTeam { team: OrgTeam; pct: number; roles: OrgRole[] }
export interface ChartUnit { unit: OrgUnit; teams: ChartTeam[] }
export interface ProductAnswer { product: ProductRef; chart: ChartUnit[]; matrix: { role: OrgRole; R: number; A: number; C: number; I: number }[] }
/** A product: its organisation chart (units → teams serving it → roles they provide) and its RACI matrix summed per role (in-scope activities). */
export function byProduct(m: OrgModel, productId: string): ProductAnswer | null {
  const product = m.products.find((p) => p.id === productId);
  if (!product) return null;
  const chart: ChartUnit[] = [];
  for (const { team, pct } of teamsServing(m.teams, productId)) {
    const skills = new Set(team.lines.filter((l) => (+l.etp || 0) > 0).map((l) => l.skill));
    const roles = m.roles.filter((r) => r.kind === 'role' && r.teamSkill !== undefined && skills.has(r.teamSkill));
    const unit = m.units.find((u) => u.id === team.unit) ?? { id: team.unit, name: team.unit || '(no unit)', type: 'other' as const };
    const at = chart.find((c) => c.unit.id === unit.id) ?? (chart.push({ unit, teams: [] }), chart[chart.length - 1]!);
    at.teams.push({ team, pct, roles });
  }
  const counts = new Map<string, { R: number; A: number; C: number; I: number }>(), by = roleById(m);
  const add = (id: string, l: 'R' | 'A' | 'C' | 'I') => { const c = counts.get(id) ?? { R: 0, A: 0, C: 0, I: 0 }; c[l]++; counts.set(id, c); };
  for (const a of m.activities.filter((x) => x.inScope)) {
    a.raci.R.forEach((id) => add(id, 'R')); if (a.raci.A) add(a.raci.A, 'A'); a.raci.C.forEach((id) => add(id, 'C')); a.raci.I.forEach((id) => add(id, 'I'));
  }
  const matrix = [...counts].map(([id, c]) => ({ role: by.get(id) ?? { id, name: id, kind: 'role' as const, regulatory: false }, ...c }))
    .sort((a, b) => b.R - a.R || a.role.name.localeCompare(b.role.name));
  return { product, chart, matrix };
}
