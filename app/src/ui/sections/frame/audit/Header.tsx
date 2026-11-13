import { memo, useState } from 'react';
import { setHeader } from '@/controllers/audit';
import { AUDIT_STATUSES, type AuditHeader, type HeaderPatch } from '@/domain/audit';
import { structuralEqual } from '@/store/equal';
import { toast } from '@/ui/uiState';
import { DraftText } from '@/ui/widgets/DraftText';

export const STATUS_LABELS: Record<string, string> = { planned: 'Planned', inProgress: 'In progress', closed: 'Closed' };
const save = (patch: HeaderPatch, what: string): void => { if (!setHeader(patch)) toast(`${what} refused`); };

/** The auditors: each removable, the new one checked by the header command (a name is needed). */
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

/**
 * The audit header (§ 15.3): code, client, scope, status, "as of" date and the auditors (the interviews are planned in Plan). Created by its first
 * edit. Memoised on its content:
 * an edit of an activity does not re-render it.
 */
export const Header = memo(function Header({ header: h }: { header: AuditHeader | undefined }) {
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
      <Auditors h={h} />
    </section>
  );
}, structuralEqual);
