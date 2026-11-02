import { memo, useId, useMemo, useState } from 'react';
import { setHeader } from '@/controllers/audit';
import { AUDIT_STATUSES, interviewContext, interviewProgress, interviewsOf, type AuditStatus, type Interview } from '@/domain/audit';
import { readProcess } from '@/domain/process';
import type { AuditViewData } from '@/store/auditHooks';
import { toast } from '@/ui/uiState';
import { STATUS_LABELS } from './Header';

const pct = (x: number | null): string => (x === null ? '—' : `${Math.round(x * 100)} %`);
const many = (e: React.ChangeEvent<HTMLSelectElement>): string[] => [...e.target.selectedOptions].map((o) => o.value);

/** The form that adds an audit activity: code, date, auditor, the roles it targets and the activities they do (several of each). */
function AddActivity({ data, list }: { data: AuditViewData; list: Interview[] }) {
  const id = useId(), acts = useMemo(() => readProcess(data.doc).activities.filter((a) => a.inScope !== false), [data.doc]);
  const [code, setCode] = useState(''), [date, setDate] = useState(''), [auditor, setAuditor] = useState('');
  const [roles, setRoles] = useState<string[]>([]), [activities, setActivities] = useState<string[]>([]);
  const add = () => {
    const role = data.actors.filter((r) => roles.includes(r.id)).map((r) => r.name).join(', ').slice(0, 200) || 'Roles to name';
    const next: Interview = { code, role, date, ...(roles.length ? { roles } : {}), ...(activities.length ? { activities } : {}),
      ...(auditor ? { auditor } : {}) };
    if (setHeader({ interviews: [...list, next] })) { setCode(''); setDate(''); setRoles([]); setActivities([]); }
    else toast('Audit activity refused: a code (unique), a date and at least a role are needed');
  };
  return (
    <fieldset className="ac-audit-list">
      <legend>New audit activity</legend>
      <div className="ac-form-row">
        <input type="text" aria-label="Audit activity code" placeholder="INT-1" value={code} onChange={(e) => setCode(e.target.value)} />
        <input type="date" aria-label="Audit activity date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label htmlFor={`${id}-a`}>Auditor of the new activity</label>
        <select id={`${id}-a`} value={auditor} onChange={(e) => setAuditor(e.target.value)}>
          <option value="">—</option>
          {(data.audit.header?.auditors ?? []).map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
      </div>
      <div className="ac-form-row">
        <label htmlFor={`${id}-r`}>Roles (people targeted)</label>
        <select id={`${id}-r`} multiple size={5} value={roles} onChange={(e) => setRoles(many(e))}>
          {data.actors.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <label htmlFor={`${id}-t`}>Activities (what they do)</label>
        <select id={`${id}-t`} multiple size={5} value={activities} onChange={(e) => setActivities(many(e))}>
          {acts.map((a) => <option key={a.id} value={a.id}>{`${a.id} · ${a.name}`}</option>)}
        </select>
        <button type="button" onClick={add}>+ Add audit activity</button>
      </div>
    </fieldset>
  );
}

/** The context of the selected audit activities: who to interview, and what the audit already holds on each activity they do. */
function Context({ data, codes }: { data: AuditViewData; codes: string[] }) {
  const c = useMemo(() => interviewContext(data.doc, codes), [data.doc, codes]);
  if (!codes.length) return <p className="ac-muted">Select one or more audit activities above to see the context of the interview.</p>;
  return (
    <section aria-label="Interview context">
      <h3>Interview context — {c.interviews.map((i) => i.code).join(', ')}</h3>
      <p><strong>Roles to interview:</strong> {c.roles.length ? c.roles.map((r) => r.name).join(', ') : c.interviews.map((i) => i.role).join(', ')}
        {c.interviews.some((i) => i.who) && <> · <strong>People:</strong> {c.interviews.flatMap((i) => (i.who ? [i.who] : [])).join(', ')}</>}</p>
      <table className="ac-table">
        <caption>What they do, and what the audit holds already</caption>
        <thead><tr><th>Activity</th><th>Phase</th><th>Status</th><th>Observations</th><th>Tools</th><th>Pain points</th><th>Evidence</th>
          <th>Covered</th></tr></thead>
        <tbody>{c.activities.map((a) => (
          <tr key={a.id}>
            <th scope="row">{`${a.id} · ${a.name}`}</th><td>{a.phase}</td><td>{a.status ? STATUS_LABELS[a.status] : 'Not started'}</td>
            <td>{a.observations}</td><td>{a.tools.join(', ') || '—'}</td><td>{a.painPoints.join('; ') || '—'}</td><td>{a.evidence}</td>
            <td>{a.covered ? '✓ yes' : 'no'}</td>
          </tr>
        ))}</tbody>
      </table>
      {!c.activities.length && <p className="ac-muted">These audit activities name no process activity yet.</p>}
    </section>
  );
}

/**
 * 🔎 Audit › Audit activities (owner's request 2026-11-02): the audit is the top level, made of audit activities (interviews), each targeting one
 * or more roles and the activities they do. The auditor registers (picks their name), selects one or more of their audit activities and sees the
 * context of the interview; the table traces every audit activity with its progression (activities covered: their audit closed, or evidence naming
 * the audit activity). Status: as set, else derived from the progression.
 */
export const AuditActivities = memo(function AuditActivities({ data }: { data: AuditViewData }) {
  const id = useId(), [auditor, setAuditor] = useState(''), [picked, setPicked] = useState<string[]>([]);
  const all = data.audit.header?.interviews ?? [], mine = interviewsOf(all, auditor);
  const progress = useMemo(() => new Map(interviewProgress(data.doc).map((p) => [p.code, p])), [data.doc]);
  const names = useMemo(() => new Map(data.actors.map((r) => [r.id, r.name])), [data.actors]);
  const toggle = (code: string) => setPicked((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]));
  const setStatus = (i: Interview, status: AuditStatus) => {
    if (!setHeader({ interviews: all.map((x) => (x === i ? { ...x, status } : x)) })) toast('Status refused');
  };
  const remove = (i: Interview) => { if (!setHeader({ interviews: all.filter((x) => x !== i) })) toast('Removal refused'); };
  const shown = picked.filter((c) => mine.some((i) => i.code === c));
  return (
    <>
      <div className="ac-form-row">
        <label htmlFor={`${id}-me`}>I am (auditor)</label>
        <select id={`${id}-me`} value={auditor} onChange={(e) => { setAuditor(e.target.value); setPicked([]); }}>
          <option value="">Every auditor</option>
          {(data.audit.header?.auditors ?? []).map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
        <span className="ac-muted">{`${mine.length} audit activit${mine.length === 1 ? 'y' : 'ies'}${auditor ? ` for ${auditor}` : ''}`}</span>
      </div>
      <table className="ac-table">
        <caption>Audit activities and their progression</caption>
        <thead><tr><th>Select</th><th>Code</th><th>Roles</th><th>Activities</th><th>Auditor</th><th>Date</th><th>Progress</th><th>Status</th><th>Remove</th></tr></thead>
        <tbody>{mine.map((i) => {
          const p = progress.get(i.code);
          return (
            <tr key={i.code}>
              <td><input type="checkbox" aria-label={`Select ${i.code}`} checked={picked.includes(i.code)} onChange={() => toggle(i.code)} /></td>
              <th scope="row">{i.code}</th>
              <td>{i.roles?.length ? i.roles.map((r) => names.get(r) ?? r).join(', ') : i.role}</td>
              <td>{i.activities?.length ?? 0}</td><td>{i.auditor ?? '—'}</td><td>{i.date}</td>
              <td>{p ? `${p.covered} / ${p.activities} (${pct(p.share)})` : '—'}</td>
              <td><select aria-label={`Status of ${i.code}`} value={p?.status ?? 'planned'} onChange={(e) => setStatus(i, e.target.value as AuditStatus)}>
                {AUDIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select></td>
              <td><button type="button" aria-label={`Remove ${i.code}`} onClick={() => remove(i)}>✕</button></td>
            </tr>
          );
        })}</tbody>
      </table>
      <Context data={data} codes={shown} />
      <AddActivity data={data} list={all} />
    </>
  );
});
