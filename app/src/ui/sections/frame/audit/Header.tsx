import { useState } from 'react';
import { setHeader } from '@/controllers/audit';
import { AUDIT_STATUSES, type AuditHeader, type HeaderPatch } from '@/domain/audit';
import { toast } from '@/ui/uiState';
import { DraftText } from '@/ui/widgets/DraftText';

export const STATUS_LABELS: Record<string, string> = { planned: 'Planned', inProgress: 'In progress', closed: 'Closed' };
const save = (patch: HeaderPatch, what: string): void => { if (!setHeader(patch)) toast(`${what} refused`); };

/** A list of small records with an add row (auditors, interviews): each entry removable, the new one checked by the header command. */
function Interviews({ h }: { h: AuditHeader | undefined }) {
  const [code, setCode] = useState(''), [role, setRole] = useState(''), [date, setDate] = useState('');
  const list = h?.interviews ?? [];
  const add = () => {
    if (setHeader({ interviews: [...list, { code, role, date }] })) { setCode(''); setRole(''); setDate(''); }
    else toast('Interview refused: code, role and date are needed');
  };
  return (
    <fieldset className="ac-audit-list">
      <legend>Interviews ({list.length})</legend>
      <ul>{list.map((i) => <li key={i.code}>{i.code} · {i.role} · {i.date}{' '}
        <button type="button" aria-label={`Remove interview ${i.code}`} onClick={() => save({ interviews: list.filter((x) => x !== i) }, 'Removal')}>✕</button>
      </li>)}</ul>
      <div className="ac-form-row">
        <input type="text" aria-label="New interview code" placeholder="INT-1" value={code} onChange={(e) => setCode(e.target.value)} />
        <input type="text" aria-label="Role interviewed" placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
        <input type="date" aria-label="Interview date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" onClick={add}>+ Add interview</button>
      </div>
    </fieldset>
  );
}

function Auditors({ h }: { h: AuditHeader | undefined }) {
  const [name, setName] = useState(''), [org, setOrg] = useState(''), list = h?.auditors ?? [];
  const add = () => {
    if (setHeader({ auditors: [...list, { name, organisation: org }] })) { setName(''); setOrg(''); } else toast('Auditor refused: a name is needed');
  };
  return (
    <fieldset className="ac-audit-list">
      <legend>Auditors ({list.length})</legend>
      <ul>{list.map((a, i) => <li key={`${a.name}-${i}`}>{a.name}{a.organisation ? ` (${a.organisation})` : ''}{' '}
        <button type="button" aria-label={`Remove auditor ${a.name}`} onClick={() => save({ auditors: list.filter((x) => x !== a) }, 'Removal')}>✕</button>
      </li>)}</ul>
      <div className="ac-form-row">
        <input type="text" aria-label="New auditor" placeholder="Auditor (role or name)" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="text" aria-label="Auditor organisation" placeholder="Organisation" value={org} onChange={(e) => setOrg(e.target.value)} />
        <button type="button" onClick={add}>+ Add auditor</button>
      </div>
    </fieldset>
  );
}

/** The audit header (§ 15.3): code, client, scope, status, "as of" date, auditors and interviews. Created by its first edit. */
export function Header({ header: h }: { header: AuditHeader | undefined }) {
  return (
    <section aria-labelledby="ac-audit-head-h">
      <h2 id="ac-audit-head-h">Audit header</h2>
      {!h && <p className="ac-muted">No audit yet: the first edit below creates the header (code AUDIT-1, planned, as of today).</p>}
      <div className="ac-audit-grid">
        <label>Code <DraftText label="Audit code" value={h?.code ?? ''} placeholder="AUDIT-1" onCommit={(v) => save({ code: v }, 'Code')} /></label>
        <label>Client <DraftText label="Client" value={h?.client ?? ''} onCommit={(v) => save({ client: v }, 'Client')} /></label>
        <label>Scope <DraftText label="Audit scope" value={h?.scope ?? ''} onCommit={(v) => save({ scope: v }, 'Scope')} /></label>
        <label>Status <select aria-label="Audit status" value={h?.status ?? 'planned'}
          onChange={(e) => save({ status: e.target.value as AuditHeader['status'] }, 'Status')}>
          {AUDIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select></label>
        <label>As of <input type="date" aria-label="Audit as of" value={h?.asOf ?? ''}
          onChange={(e) => e.target.value && save({ asOf: e.target.value }, 'Date')} /></label>
      </div>
      <div className="ac-audit-grid"><Auditors h={h} /><Interviews h={h} /></div>
    </section>
  );
}
