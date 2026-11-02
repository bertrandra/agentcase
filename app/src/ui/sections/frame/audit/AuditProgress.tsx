import { memo, useMemo } from 'react';
import { setHeader } from '@/controllers/audit';
import { AUDIT_STATUSES, interviewProgress, type AuditStatus, type Interview } from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';
import { toast } from '@/ui/uiState';
import { AuditorPick, useAuditor } from './auditor';
import { STATUS_LABELS } from './Header';

const pct = (x: number | null): string => (x === null ? '—' : `${Math.round(x * 100)} %`);

/** 🔎 Audit › Audit progress: every audit activity with its progression (activities covered: their audit closed, or evidence naming it), status. */
export const AuditProgress = memo(function AuditProgress({ data }: { data: AuditViewData }) {
  const f = useAuditor(data);
  const progress = useMemo(() => new Map(interviewProgress(data.doc).map((p) => [p.code, p])), [data.doc]);
  const names = useMemo(() => new Map(data.actors.map((r) => [r.id, r.name])), [data.actors]);
  const setStatus = (i: Interview, status: AuditStatus) => {
    if (!setHeader({ interviews: f.all.map((x) => (x === i ? { ...x, status } : x)) })) toast('Status refused');
  };
  const remove = (i: Interview) => { if (!setHeader({ interviews: f.all.filter((x) => x !== i) })) toast('Removal refused'); };
  return (
    <>
      <AuditorPick data={data} f={f} />
      <table className="ac-table">
        <caption>Audit activities and their progression</caption>
        <thead><tr><th>Code</th><th>Roles</th><th>Activities</th><th>Auditor</th><th>Date</th><th>Progress</th><th>Status</th><th>Remove</th></tr></thead>
        <tbody>{f.mine.map((i) => {
          const p = progress.get(i.code);
          return (
            <tr key={i.code}>
              <th scope="row">{i.code}</th>
              <td>{i.roles?.length ? i.roles.map((r) => names.get(r) ?? r).join(', ') : i.role}</td>
              <td>{i.activities?.length ?? 0}</td><td>{i.auditor ?? '—'}</td><td>{i.date}</td>
              <td>{p ? `${p.covered} / ${p.activities} (${pct(p.share)})` : '—'}</td>
              <td><select aria-label={`Status of ${i.code}`} value={p?.status ?? 'planned'} onChange={(e) => setStatus(i, e.target.value as AuditStatus)}>
                {AUDIT_STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
              </select></td>
              <td><button type="button" aria-label={`Remove ${i.code}`} onClick={() => remove(i)}>✕</button></td>
            </tr>
          );
        })}</tbody>
      </table>
    </>
  );
});
