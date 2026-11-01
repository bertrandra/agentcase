import { useMemo } from 'react';
import { readRaci } from '@/domain/org';
import type { AuditViewData } from '@/store/auditHooks';
import { AuditTable, isAudited } from './AuditTable';
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
      <AuditTable labelledBy="ac-audit-roles-h"
        head={['Role', 'Team skill', 'Responsible for (in scope)', 'Audit', 'Activities with an FTE share of the role']}>
        {roles.map((r) => (
          <tr key={r.id}>
            <SelectCell id={r.id} selected={selected}>{r.name}</SelectCell>
            <td>{r.teamSkill ?? '—'}</td><td>{responsible.get(r.id) ?? 0}</td>
            <td>{isAudited(data.audit.elements.get(r.id)) ? 'Audited' : 'Not audited'}</td><td>{split(r.id)}</td>
          </tr>
        ))}
      </AuditTable>
      {sel && <ElementForm data={data} id={sel.id} title={`role ${sel.name}`} blocks={['readiness', 'people', 'time']} />}
    </>
  );
}
