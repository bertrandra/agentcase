import { memo, useId, useMemo, useState } from 'react';
import { setHeader } from '@/controllers/audit';
import { readRaci } from '@/domain/org';
import { readProcess } from '@/domain/process';
import type { AuditViewData } from '@/store/auditHooks';
import { toast } from '@/ui/uiState';
import { nextCode, plannedBy, scopeInterviews } from './facts';
import { clearDraft, openInterview, toggleDraft, useAuditView } from './view';

const key = (role: string, activity: string): string => `${role}|${activity}`;
type Cell = 'draft' | 'held' | 'does' | 'free';

/**
 * 🔎 Audit › Plan (owner's request 2026-11-13): the roles of the scope against its in-scope activities, by phase. A cell says whether the role
 * does the activity (RACI Responsible or Accountable) and which interview already covers the pair; clicking cells puts them in the draft interview
 * (its roles and activities), created with a code, a date and an auditor. A column no interview covers is flagged.
 */
export const Plan = memo(function Plan({ data }: { data: AuditViewData }) {
  const id = useId(), draft = useAuditView((s) => s.draft), all = data.audit.header?.interviews ?? [];
  const rows = useMemo(() => data.rows.filter((r) => r.inScope), [data.rows]);
  const phases = useMemo(() => readProcess(data.doc).phases.filter((p) => rows.some((r) => r.phase === p.id)), [data.doc, rows]);
  const does = useMemo(() => new Map(readRaci(data.doc).map((a) => [a.id, new Set([...a.raci.R, ...(a.raci.A ? [a.raci.A] : [])])])), [data.doc]);
  const interviews = useMemo(() => scopeInterviews(data), [data]), planned = plannedBy(interviews), [every, setEvery] = useState(false);
  const all0 = data.actors.filter((a) => a.kind !== 'agent');
  // by default the roles that do an in-scope activity, hold one in an interview or in the draft; every role on request
  const busy = (r: string) => rows.some((a) => does.get(a.id)?.has(r)) || interviews.some((i) => i.roles?.includes(r))
    || draft.some((k) => k.startsWith(`${r}|`));
  const roles = every ? all0 : all0.filter((r) => busy(r.id));
  const held = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of interviews) for (const r of i.roles ?? []) for (const a of i.activities ?? []) if (!m.has(key(r, a))) m.set(key(r, a), i.code);
    return m;
  }, [interviews]);
  const [code, setCode] = useState(''), [date, setDate] = useState(''), [auditor, setAuditor] = useState('');
  const auditors = data.audit.header?.auditors ?? [];
  const draftRoles = [...new Set(draft.map((k) => k.split('|')[0]!))].filter((r) => roles.some((x) => x.id === r));
  const draftActs = [...new Set(draft.map((k) => k.split('|')[1]!))].filter((a) => rows.some((x) => x.id === a));
  const shownCode = code || nextCode(all);
  const create = () => {
    const role = roles.filter((r) => draftRoles.includes(r.id)).map((r) => r.name).join(', ').slice(0, 200);
    const next = { code: shownCode, role, date, roles: draftRoles, activities: draftActs, ...(auditor ? { auditor } : {}) };
    if (!draftRoles.length || !draftActs.length) { toast('Pick at least one cell (a role and an activity) in the matrix'); return; }
    if (setHeader({ interviews: [...all, next] })) { toast(`${shownCode} planned`); clearDraft(); setCode(''); setDate(''); }
    else toast('Interview refused: a unique code and a date are needed');
  };
  const state = (r: string, a: string): Cell => (draft.includes(key(r, a)) ? 'draft' : held.has(key(r, a)) ? 'held' : does.get(a)?.has(r) ? 'does' : 'free');
  const text = (c: Cell, r: string, a: string): string => (c === 'draft' ? 'Draft' : c === 'held' ? held.get(key(r, a))! : c === 'does' ? 'R/A' : '');
  return (
    <div className="ac-audit-split">
      <section className="ac-audit-card ac-audit-main" aria-labelledby={`${id}-h`}>
        <div className="ac-audit-matrix-tools">
          <h2 id={`${id}-h`}>Roles × activities in scope</h2>
          <label><input type="checkbox" checked={every} onChange={(e) => setEvery(e.target.checked)} /> Show every role ({all0.length})</label>
        </div>
        <p className="ac-muted">Click cells to put a role and an activity in the draft interview. R/A: the role is Responsible or Accountable
          (🧭 Who does what).</p>
        {rows.length === 0 || roles.length === 0 ? <p className="ac-muted">No role or no in-scope activity in this scope.</p> : (
          <div className="ac-table-wrap" tabIndex={0}>
            <table className="ac-audit-matrix" aria-labelledby={`${id}-h`}>
              <thead>
                <tr><td />{phases.map((p) => <th key={p.id} scope="colgroup" colSpan={rows.filter((r) => r.phase === p.id).length}>{p.id} · {p.name}</th>)}</tr>
                <tr>
                  <th scope="col">Role</th>
                  {phases.flatMap((p) => rows.filter((r) => r.phase === p.id)).map((r) => (
                    <th key={r.id} scope="col" data-uncovered={!planned.has(r.id) || undefined} title={r.name}>
                      <span>{r.id}</span><span className="ac-audit-matrix-name">{r.name}</span>
                      {!planned.has(r.id) && <span className="ac-sr"> (in no interview)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <th scope="row">{role.name}</th>
                    {phases.flatMap((p) => rows.filter((r) => r.phase === p.id)).map((r) => {
                      const c = state(role.id, r.id);
                      return (
                        <td key={r.id}>
                          <button type="button" className="ac-audit-cell" data-cell={c} aria-pressed={c === 'draft'}
                            aria-label={`${role.name} on ${r.id}${c === 'held' ? `, in ${held.get(key(role.id, r.id))}` : c === 'does' ? ', does it' : ''}`}
                            onClick={() => toggleDraft(key(role.id, r.id))}>{text(c, role.id, r.id)}</button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ul className="ac-audit-legend" aria-label="Legend">
          <li><span className="ac-audit-key" data-key="draft" aria-hidden="true" />In the draft</li>
          <li><span className="ac-audit-key" data-key="held" aria-hidden="true" />In an interview</li>
          <li><span className="ac-audit-key" data-key="does" aria-hidden="true" />The role does it</li>
          <li><span className="ac-audit-key" data-key="uncovered" aria-hidden="true" />Activity in no interview</li>
        </ul>
      </section>

      <aside className="ac-audit-side" aria-label="Draft interview">
        <section className="ac-audit-card ac-audit-draft" aria-labelledby={`${id}-d`}>
          <h2 id={`${id}-d`}>New interview</h2>
          <div className="ac-audit-grid">
            <label>Code<input type="text" value={code} placeholder={shownCode} onChange={(e) => setCode(e.target.value)} /></label>
            <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          </div>
          <label className="ac-audit-stack">Auditor
            <select value={auditor} onChange={(e) => setAuditor(e.target.value)}>
              <option value="">—</option>{auditors.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </label>
          {auditors.length === 0 && <p className="ac-muted">Add the auditors in Cockpit › Edit the audit header.</p>}
          <h3>Roles ({draftRoles.length})</h3>
          <ul className="ac-audit-chips">{draftRoles.map((r) => <li key={r}>{roles.find((x) => x.id === r)?.name ?? r}</li>)}</ul>
          <h3>Activities ({draftActs.length})</h3>
          <ul className="ac-audit-chips">{draftActs.map((a) => <li key={a}>{a}</li>)}</ul>
          <div className="ac-audit-actions">
            <button type="button" className="ac-audit-primary" onClick={create}>Create {shownCode}</button>
            <button type="button" disabled={!draft.length} onClick={clearDraft}>Clear the draft</button>
          </div>
        </section>
        <section className="ac-audit-card" aria-labelledby={`${id}-l`}>
          <h2 id={`${id}-l`}>Interviews of the scope ({interviews.length})</h2>
          {interviews.length ? (
            <ul className="ac-audit-list-plain">
              {interviews.map((i) => <li key={i.code}><button type="button" className="ac-link" onClick={() => openInterview(i.code)}>{i.code}</button>
                <span className="ac-muted"> {i.date} · {(i.activities ?? []).length} activit{(i.activities ?? []).length === 1 ? 'y' : 'ies'}</span></li>)}
            </ul>
          ) : <p className="ac-muted">None yet.</p>}
        </section>
      </aside>
    </div>
  );
});
