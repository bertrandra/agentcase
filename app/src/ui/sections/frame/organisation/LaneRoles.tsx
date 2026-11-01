import { memo } from 'react';
import { setLaneRole } from '@/controllers/org';
import { laneRolesOf } from '@/domain/org';
import { PROGRAMME_LANES } from '@/domain/programme';
import type { XDocument } from '@/domain/process';
import { usePortfolioSelector } from '@/store/hooks';
import { toast } from '@/ui/uiState';
import { useOrgSelector } from '@/store/orgHooks';
import type { OrgModel } from '@/domain/org';

/**
 * The programme's operating-model roles mapped to organisation roles (SPEC_FIXES FX-D11 (a)): each lane of the transformation programme names the
 * role — and so the team skill — that staffs it. Kept in the organisation part; the BPMN export with both processes names it on the lane. No figure
 * reads it.
 */
/** The roles of the catalogue (kept while structurally equal: a name edit elsewhere renders nothing here). */
const rolesOnly = (m: OrgModel) => m.roles.filter((r) => r.kind === 'role');
/** The mapping as entries (a plain value: the panel re-renders only when it changes). */
const lanesOfPf = (p: { common: { BPMN?: unknown } }): [string, string][] => [...laneRolesOf(p.common.BPMN as XDocument)];
export const LaneRoles = memo(function LaneRoles() {
  const mapped = new Map(usePortfolioSelector(lanesOfPf)), roles = useOrgSelector(rolesOnly);
  const set = (lane: string, name: string, v: string) => toast(setLaneRole(lane, v || null) ? `${name} ${v ? 'mapped' : 'unmapped'} — Ctrl+Z to undo`
    : 'Nothing changed');
  return (
    <section aria-labelledby="ac-org-lanes-h">
      <h2 id="ac-org-lanes-h">Programme roles</h2>
      <p className="ac-muted">Which organisation role staffs each operating-model role of the transformation programme.</p>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table" aria-labelledby="ac-org-lanes-h">
          <thead><tr><th scope="col">Programme role</th><th scope="col">Organisation role (team skill)</th></tr></thead>
          <tbody>{PROGRAMME_LANES.filter((l) => l.role !== 'agents').map((l) => (
            <tr key={l.role}>
              <th scope="row">{l.name}</th>
              <td><select aria-label={`Organisation role for ${l.name}`} value={mapped.get(l.role) ?? ''} onChange={(e) => set(l.role, l.name, e.target.value)}>
                <option value="">— not mapped —</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}{r.teamSkill ? ` (${r.teamSkill})` : ''}</option>)}
              </select></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
});
