/** @calc-zone process-model */
import { servingPct, teamRowsOf, teamsServing } from './teams';
import type { ActivityRaci, OrgModel, OrgRole, OrgTeam, OrgUnit, ProductRef } from './types';

/**
 * "Who does what" (F-B38), the answers by activity, by role and by team. Load is the catalogue effort of the activities a role is Responsible
 * for, split evenly between its Responsible roles; a team carries the share of that load its FTE on the role's team skill gives it in each product
 * it serves. A view of the RACI: no business-case figure reads it in phase B6b.
 */
export type Letter = 'R' | 'A' | 'C' | 'I';
export const LETTERS: readonly Letter[] = ['R', 'A', 'C', 'I'];
export const lettersOf = (a: ActivityRaci, roleId: string): Letter[] =>
  LETTERS.filter((l) => (l === 'A' ? a.raci.A === roleId : a.raci[l].includes(roleId)));

export const roleById = (m: OrgModel): Map<string, OrgRole> => new Map(m.roles.map((r) => [r.id, r]));
const unitOf = (m: OrgModel, t: OrgTeam): OrgUnit | undefined => m.units.find((u) => u.id === t.unit);
/** Effort of an activity carried by one of its Responsible roles. */
export const rShare = (a: ActivityRaci): number => (a.raci.R.length ? (+a.effort || 0) / a.raci.R.length : 0);

/** FTE of a team on a team skill for a product (its lines on that skill x its share of the product). */
export function fteOn(t: OrgTeam, skill: string, productId: string): number {
  return t.lines.filter((l) => l.skill === skill).reduce((s, l) => s + (+l.etp || 0), 0) * servingPct(t, productId) / 100;
}

export interface Provider { team: OrgTeam; unit?: OrgUnit; fte: number }
/** The teams serving a product that provide a team skill, with the FTE each gives the product on it. */
export function providers(m: OrgModel, productId: string, skill: string | undefined): Provider[] {
  if (skill === undefined) return [];
  return teamsServing(m.teams, productId).map(({ team }) => ({ team, unit: unitOf(m, team), fte: fteOn(team, skill, productId) }))
    .filter((p) => p.fte > 0);
}

export interface PerProduct { product: ProductRef; teams: Provider[] }
export interface ActivityAnswer { activity: ActivityRaci; roles: Record<Letter, OrgRole[]>; agent?: OrgRole; perProduct: PerProduct[] }
export function byActivity(m: OrgModel, id: string): ActivityAnswer | null {
  const a = m.activities.find((x) => x.id === id), by = roleById(m);
  if (!a) return null;
  const pick = (ids: string[]): OrgRole[] => ids.map((i) => by.get(i)).filter((r): r is OrgRole => !!r);
  const roles = { R: pick(a.raci.R), A: pick(a.raci.A ? [a.raci.A] : []), C: pick(a.raci.C), I: pick(a.raci.I) };
  const agent = a.agent ? by.get(a.agent) : undefined;
  const perProduct = m.products.map((product) => ({ product, teams: roles.R.flatMap((r) => providers(m, product.id, r.teamSkill)) }));
  return { activity: a, roles, ...(agent ? { agent } : {}), perProduct };
}

export interface RoleAnswer { role: OrgRole; activities: Record<Letter, ActivityRaci[]>; load: number; perProduct: PerProduct[] }
export function byRole(m: OrgModel, roleId: string): RoleAnswer | null {
  const role = roleById(m).get(roleId);
  if (!role) return null;
  const inScope = m.activities.filter((a) => a.inScope), activities = { R: [], A: [], C: [], I: [] } as Record<Letter, ActivityRaci[]>;
  for (const a of inScope) for (const l of lettersOf(a, roleId)) activities[l].push(a);
  const load = activities.R.reduce((s, a) => s + rShare(a), 0);
  return { role, activities, load, perProduct: m.products.map((product) => ({ product, teams: providers(m, product.id, role.teamSkill) })) };
}

export interface TeamAnswer {
  team: OrgTeam; unit?: OrgUnit; fte: number; serves: { product: ProductRef; pct: number }[]; roles: OrgRole[]; activities: ActivityRaci[]; load: number;
}
/** A team: the products it serves, the roles its lines provide, the in-scope activities it performs, its load (effort points) and FTE. */
export function byTeam(m: OrgModel, teamId: string): TeamAnswer | null {
  const team = m.teams.find((t) => t.id === teamId);
  if (!team) return null;
  const skills = new Set(team.lines.filter((l) => (+l.etp || 0) > 0).map((l) => l.skill));
  const roles = m.roles.filter((r) => r.kind === 'role' && r.teamSkill !== undefined && skills.has(r.teamSkill));
  const serves = m.products.map((product) => ({ product, pct: servingPct(team, product.id) })).filter((s) => s.pct > 0);
  const acts = new Set<ActivityRaci>();
  let load = 0;
  for (const { product } of serves) { const w = teamWork(m, team, product.id); load += w.load; for (const a of w.acts) acts.add(a); }
  const fte = team.lines.reduce((s, l) => s + (+l.etp || 0), 0);
  return { team, unit: unitOf(m, team), fte, serves, roles, activities: [...acts], load };
}

/**
 * The work of a team for one product: the in-scope activities it is Responsible for and their load (effort points) — the activity's own team
 * split (FX-22) when it has one, else each Responsible role's share split between the teams providing its skill by their FTE for the product.
 */
export function teamWork(m: OrgModel, team: OrgTeam, productId: string): { load: number; acts: ActivityRaci[] } {
  const by = roleById(m), rows = teamRowsOf(m.teams, productId), acts: ActivityRaci[] = [];
  let load = 0;
  for (const a of m.activities) {
    if (!a.inScope) continue;
    const share = a.raci.teams;
    if (share) {
      const pct = share[team.id] ?? 0;
      if (pct > 0) { acts.push(a); load += (+a.effort || 0) * pct / 100; }
      continue;
    }
    let mineAny = false;
    for (const rid of a.raci.R) {
      const skill = by.get(rid)?.teamSkill;
      if (skill === undefined) continue;
      const all = rows.filter((r) => r.skill === skill).reduce((s, r) => s + (+r.etp || 0), 0), mine = fteOn(team, skill, productId);
      if (all > 0 && mine > 0) { mineAny = true; load += rShare(a) * mine / all; }
    }
    if (mineAny) acts.push(a);
  }
  return { load, acts };
}
