import { useMemo } from 'react';
import { readRaci } from '@/domain/org';
import type { AuditViewData } from '@/store/auditHooks';
import { ElementForm } from './ElementForm';
import { SelectCell } from './SelectCell';
import { useAuditView } from './view';

/**
 * The audit at role level (§ 15.3 "Actors get the same blocks", § 16.6, D-B13): each role of the organisation model (🏢 Organisation, the case's
 * resources) with its team skill and the in-scope activities it is Responsible for (🧭 Who does what); its form records the tools it uses
 * across activities, its workload and its constraints. Per-activity values split by role are entered on the activity.
 */
export function Roles({ data }: { data: AuditViewData }) {
  const selected = useAuditView((s) => s.selected);
  const responsible = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of readRaci(data.doc).filter((x) => x.inScope)) for (const r of a.raci.R) m.set(r, (m.get(r) ?? 0) + 1);
    return m;
  }, [data.doc]);
  const roles = data.actors.filter((a) => a.kind !== 'agent'), sel = roles.find((r) => r.id === selected);
  const split = (id: string) => data.rows.filter((r) => r.fte.some((f) => f.role === id)).length;
  return (
    <>
      <h2 id="ac-audit-roles-h">Roles</h2>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table" aria-labelledby="ac-audit-roles-h">
          <thead><tr><th scope="col">Role</th><th scope="col">Team skill</th><th scope="col">Responsible for (in scope)</th><th scope="col">Audit</th>
            <th scope="col">Activities with an FTE share of the role</th></tr></thead>
          <tbody>{roles.map((r) => {
            const a = data.audit.elements.get(r.id), audited = !!a && a.observations.length + a.tools.length + a.painPoints.length > 0;
            return (
              <tr key={r.id}>
                <SelectCell id={r.id} selected={selected}>{r.name}</SelectCell>
                <td>{r.teamSkill ?? '—'}</td><td>{responsible.get(r.id) ?? 0}</td><td>{audited ? 'Audited' : 'Not audited'}</td><td>{split(r.id)}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {sel && <ElementForm data={data} id={sel.id} title={`role ${sel.name}`} blocks={['readiness', 'people', 'time']} />}
    </>
  );
}
