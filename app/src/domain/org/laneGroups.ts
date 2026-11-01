/** @calc-zone process-model */
import type { OrgModel } from './types';
import { providers, roleById } from './views';

/**
 * The resource histogram grouped by organisation (SPEC_FIXES FX-16, F-B76): a programme lane (operating-model role) belongs to the organisation
 * role it is mapped to (FX-D11), so to the team that gives the product the most FTE on that role's skill, the team's unit and its main location
 * on that skill. A lane that is not mapped, or whose role no team provides, is grouped apart. A view: no figure reads it.
 */
export type HistGroupBy = 'role' | 'team' | 'unit' | 'location';
export interface LaneGroup { key: string; label: string }
export const NOT_MAPPED: LaneGroup = { key: 'not-mapped', label: 'Not mapped to an organisation role' };
export const NOT_STAFFED: LaneGroup = { key: 'not-staffed', label: 'Not staffed' };

/** The group of each lane for one product (`mapping`: lane → organisation role id). */
export function laneGroupOf(m: OrgModel, mapping: ReadonlyMap<string, string>, productId: string, by: Exclude<HistGroupBy, 'role'>):
  (lane: string) => LaneGroup {
  const roles = roleById(m);
  return (lane) => {
    const role = roles.get(mapping.get(lane) ?? '');
    if (!role) return NOT_MAPPED;
    const best = providers(m, productId, role.teamSkill).sort((x, y) => y.fte - x.fte)[0];
    if (!best) return NOT_STAFFED;
    if (by === 'team') return { key: best.team.id, label: best.team.name };
    if (by === 'unit') return { key: best.team.unit, label: best.unit?.name ?? best.team.unit };
    const byLoc = new Map<string, number>();
    for (const l of best.team.lines.filter((x) => x.skill === role.teamSkill)) byLoc.set(l.loc, (byLoc.get(l.loc) ?? 0) + (+l.etp || 0));
    const loc = [...byLoc].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return loc ? { key: `loc:${loc}`, label: loc } : NOT_STAFFED;
  };
}
