import { useState } from 'react';
import { editAudit, today } from '@/controllers/audit';
import { AUDIT_FIELDS, BLOCK_LABELS, CONFIDENCES, PERIODS, SOURCES, type AuditBlock, type AuditField, type Observation } from '@/domain/audit';
import type { ActorView } from '@/domain/process';
import { toast } from '@/ui/uiState';
import { DraftText } from '@/ui/widgets/DraftText';

export const SOURCE_LABELS: Record<string, string> = { interview: 'Interview', toolExport: 'Tool export', measurement: 'Measurement', document: 'Document',
  estimate: 'Estimate' };
type Props = { id: string; observations: Observation[]; roles: ActorView[] };

/** One observed value: value (a choice, a number or text), period, source, date, confidence; per role when the field allows it (D-B13). */
function FieldRow({ id, field, obs, role, roleName }: { id: string; field: AuditField; obs?: Observation; role?: string; roleName?: string }) {
  const label = `${field.label}${roleName ? ` — ${roleName}` : ''}`;
  const write = (patch: Partial<Observation>) => {
    const next: Observation = { name: field.name, value: '', ...(role ? { role } : {}), ...(obs ?? {}), ...patch };
    if (!next.value.trim()) { if (obs) editAudit(id, { kind: 'removeObservation', name: field.name, ...(role ? { role } : {}) }); return; }
    if (!obs && !next.date) next.date = today();
    if (!editAudit(id, { kind: 'observation', obs: next })) toast(`${label}: value refused${field.kind === 'percent' ? ' (0 to 100)' : ''}`);
  };
  const sel = (aria: string, value: string, values: readonly string[], on: (v: string) => void, labels: Record<string, string> = {}) => (
    <select aria-label={aria} value={value} disabled={!obs} onChange={(e) => on(e.target.value)}>
      <option value="">—</option>{values.map((v) => <option key={v} value={v}>{labels[v] ?? v}</option>)}
    </select>
  );
  const undef = (v: string) => v || undefined;
  return (
    <tr>
      <th scope="row">{label}{field.unit ? <span className="ac-muted"> ({field.unit})</span> : null}</th>
      <td>{field.kind === 'choice'
        ? <select aria-label={label} value={obs?.value ?? ''} onChange={(e) => write({ value: e.target.value })}>
          <option value="">—</option>{(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        : <DraftText label={label} value={obs?.value ?? ''} onCommit={(v) => write({ value: v })} />}</td>
      <td>{field.period ? sel(`${label}: period`, obs?.per ?? '', PERIODS, (v) => write({ per: undef(v) as Observation['per'] })) : null}</td>
      <td>{sel(`${label}: source`, obs?.source ?? '', SOURCES, (v) => write({ source: undef(v) as Observation['source'] }), SOURCE_LABELS)}</td>
      <td><input type="date" aria-label={`${label}: date`} value={obs?.date ?? ''} disabled={!obs}
        onChange={(e) => write({ date: undef(e.target.value) })} /></td>
      <td>{sel(`${label}: confidence`, obs?.confidence ?? '', CONFIDENCES, (v) => write({ confidence: undef(v) as Observation['confidence'] }))}</td>
    </tr>
  );
}

/** The fields of one block of § 15.3 for an element; a per-role field lists its role values and adds one for a chosen role. */
export function Block({ block, id, observations, roles }: Props & { block: AuditBlock }) {
  const [role, setRole] = useState(''), fields = AUDIT_FIELDS.filter((f) => f.block === block), perRole = fields.some((f) => f.perRole);
  const name = (r: string) => roles.find((a) => a.id === r)?.name ?? r;
  const shownRoles = [...new Set([...observations.filter((o) => o.role && fields.some((f) => f.name === o.name && f.perRole)).map((o) => o.role!),
    ...(role ? [role] : [])])];
  return (
    <fieldset className="ac-audit-block">
      <legend>{BLOCK_LABELS[block]}</legend>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <thead><tr><th scope="col">Field</th><th scope="col">Value</th><th scope="col">Per</th><th scope="col">Source</th><th scope="col">Date</th>
            <th scope="col">Confidence</th></tr></thead>
          <tbody>
            {fields.map((f) => <FieldRow key={f.name} id={id} field={f} obs={observations.find((o) => o.name === f.name && !o.role)} />)}
            {shownRoles.flatMap((r) => fields.filter((f) => f.perRole).map((f) => <FieldRow key={`${f.name}-${r}`} id={id} field={f} role={r} roleName={name(r)}
              obs={observations.find((o) => o.name === f.name && o.role === r)} />))}
          </tbody>
        </table>
      </div>
      {perRole && <label>Split per role{' '}
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label={`${BLOCK_LABELS[block]}: add a value for a role`}>
          <option value="">— choose a role —</option>
          {roles.filter((r) => r.kind !== 'agent').map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select></label>}
    </fieldset>
  );
}
