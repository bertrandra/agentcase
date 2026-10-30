/** @calc-zone process-model */
import type { Portfolio } from '../portfolio/types';
import { readProcess } from '../process/read';
import type { XDocument } from '../process/xml';
import { readRaci } from './readRaci';
import { readStoredOrg } from './readUnits';
import { DEFAULT_UNIT_ID, defaultUnit, derivedTeams } from './teams';
import type { OrgModel, OrgRole } from './types';

/** What the organisation is read from: the products and shared lines of the portfolio (one product for a single case) and the case's document. */
export type OrgSource = Pick<Portfolio, 'products' | 'sharedTeam'> & { customer?: string };

const roles = (d: XDocument): OrgRole[] => readProcess(d).actors.map((a) => {
  const r: OrgRole = { id: a.id, name: a.name, kind: a.kind === 'agent' ? 'agent' : 'role', regulatory: a.regulatory };
  if (a.teamSkill !== undefined) r.teamSkill = a.teamSkill;
  if (a.capability !== undefined) r.capability = a.capability;
  return r;
});

/**
 * The organisation model (§ 16.3) of a case: the units of its document (plus the derived default delivery unit), the teams derived from the
 * entry teams (and any team an imported document holds), the role catalogue (the document's resources) and the RACI of every activity.
 */
export function orgOf(src: OrgSource, d: XDocument): OrgModel {
  const stored = readStoredOrg(d), units = stored.units.some((u) => u.id === DEFAULT_UNIT_ID) ? stored.units
    : [defaultUnit(src.customer ?? ''), ...stored.units];
  return {
    units, teams: [...derivedTeams(src), ...stored.teams], roles: roles(d), activities: readRaci(d),
    products: src.products.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name })),
  };
}

/** The unit tree in display order (depth first, children in document order) with each unit's depth; units with an unknown parent are roots. */
export function unitTree(m: Pick<OrgModel, 'units'>): { unit: OrgModel['units'][number]; depth: number }[] {
  const ids = new Set(m.units.map((u) => u.id)), out: { unit: OrgModel['units'][number]; depth: number }[] = [], seen = new Set<string>();
  const visit = (parent: string | undefined, depth: number): void => {
    for (const u of m.units) {
      const p = u.parent && ids.has(u.parent) ? u.parent : undefined;
      if (p !== parent || seen.has(u.id)) continue;
      seen.add(u.id); out.push({ unit: u, depth }); visit(u.id, depth + 1);
    }
  };
  visit(undefined, 0);
  for (const u of m.units) if (!seen.has(u.id)) out.push({ unit: u, depth: 0 });   // a cycle from a foreign file: listed at the root
  return out;
}

/** True when `id` is `ancestor` or below it (to refuse a parent that would make a cycle). */
export function isBelow(m: Pick<OrgModel, 'units'>, id: string, ancestor: string): boolean {
  const byId = new Map(m.units.map((u) => [u.id, u]));
  for (let cur: string | undefined = id, n = 0; cur && n <= m.units.length; cur = byId.get(cur)?.parent, n++) if (cur === ancestor) return true;
  return false;
}
