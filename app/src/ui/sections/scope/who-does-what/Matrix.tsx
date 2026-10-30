import { useMemo, useState } from 'react';
import { byTeam, byUnit, unstaffed, type ActivityRaci, type OrgModel } from '@/domain/org';
import { RaciEditor } from './RaciEditor';

export interface Filters { phase: string; product: string; team: string; unit: string }
const MAX_ROWS = 120;

/** The in-scope activities that pass the filters: phase, performed by a team, by a unit's teams. */
export function filtered(m: OrgModel, f: Filters): ActivityRaci[] {
  let acts = m.activities.filter((a) => a.inScope && (!f.phase || a.phase === f.phase));
  if (f.team) { const s = new Set(byTeam(m, f.team)?.activities ?? []); acts = acts.filter((a) => s.has(a)); }
  if (f.unit) {
    const s = new Set((byUnit(m, f.unit)?.teams ?? []).flatMap((t) => byTeam(m, t.id)?.activities ?? []));
    acts = acts.filter((a) => s.has(a));
  }
  return acts;
}

/** The RACI matrix (F-B38): one row per in-scope activity, R / A / C / I as role names, the agent, and the F-B37 staffing flag of the product. */
export function Matrix({ m, f }: { m: OrgModel; f: Filters }) {
  const names = useMemo(() => new Map(m.roles.map((r) => [r.id, r.name])), [m]), [open, setOpen] = useState<string | null>(null);
  const acts = filtered(m, f), shown = acts.slice(0, MAX_ROWS), editing = m.activities.find((a) => a.id === open);
  const gaps = useMemo(() => new Set([...unstaffed(m, f.product).values()].flat().map((a) => a.id)), [m, f.product]);
  const list = (ids: string[]) => ids.map((i) => names.get(i) ?? i).join(', ') || '—';
  return (
    <>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <caption>RACI of {acts.length} in-scope activit{acts.length === 1 ? 'y' : 'ies'}
            {acts.length > MAX_ROWS ? ` (first ${MAX_ROWS}: filter by phase)` : ''}</caption>
          <thead><tr>
            <th scope="col">Activity</th><th scope="col">R</th><th scope="col">A</th><th scope="col">C</th><th scope="col">I</th><th scope="col">Agent</th>
            <th scope="col">Staffed</th><th scope="col"><span className="ac-sr">Edit</span></th>
          </tr></thead>
          <tbody>{shown.map((a) => (
            <tr key={a.id}>
              <th scope="row">{a.id} {a.name}</th>
              <td>{list(a.raci.R)}</td>
              <td>{a.raci.A ? names.get(a.raci.A) ?? a.raci.A : '—'}{a.accountableToConfirm && <span className="ac-muted"> (to confirm)</span>}</td>
              <td>{list(a.raci.C)}</td><td>{list(a.raci.I)}</td>
              <td>{a.agent ? names.get(a.agent) ?? a.agent : '—'}</td>
              <td>{gaps.has(a.id) ? '⚠ not staffed' : 'yes'}</td>
              <td><button type="button" aria-expanded={open === a.id} aria-label={`Edit the RACI of ${a.id}`}
                onClick={() => setOpen(open === a.id ? null : a.id)}>Edit</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing && <RaciEditor key={editing.id} m={m} a={editing} onClose={() => setOpen(null)} />}
    </>
  );
}
