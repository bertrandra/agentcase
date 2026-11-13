import { editAudit, today } from '@/controllers/audit';
import { CONFIDENCES, PERIODS, SOURCES, type ActivityAudit, type AuditField, type Confidence, type Observation } from '@/domain/audit';
import { toast } from '@/ui/uiState';
import { DraftText } from '@/ui/widgets/DraftText';
import { SOURCE_LABELS } from './Observations';

const CONF_LABEL: Record<Confidence, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const pctOf = (p: number): string => `${Math.round(p * 1000) / 10} %`;

/** What the model says about a field of an activity, next to the observed value (null: the model holds no comparable parameter). */
export interface ModelRef { text: string; delta?: string; off?: boolean }
export function modelRef(field: AuditField, row: ActivityAudit | undefined, value: string, role?: string): ModelRef | null {
  if (!row) return null;
  if (field.name === 'reworkRate' && row.reworkFlows.length) {
    const m = row.reworkFlows[0]!.probability, v = Number(value), diff = Number.isFinite(v) && value !== '' ? v - m * 100 : null;
    return { text: `Model: rework ${row.reworkFlows.map((f) => pctOf(f.probability)).join(', ')}`,
      ...(diff === null ? {} : { delta: `${diff >= 0 ? '+' : ''}${Math.round(diff * 10) / 10} pts vs model`, off: Math.abs(diff) > 5 }) };
  }
  if (field.name === 'automationLevel') {
    return { text: `Model: AI authority ${row.aiAuthority}`, ...(row.impliedAuthority
      ? { delta: `Implies ${row.impliedAuthority}`, off: row.impliedAuthority !== row.aiAuthority } : {}) };
  }
  if (field.name === 'fteShare' && role) {
    const m = row.fte.find((f) => f.role === role)?.modelled;
    if (m === null || m === undefined) return null;
    const v = Number(value), diff = Number.isFinite(v) && value !== '' ? v - m : null;
    const delta = diff === null ? {} : { delta: `${diff >= 0 ? '+' : ''}${Math.round(diff * 10) / 10} pts`, off: Math.abs(diff) > 5 };
    return { text: `Model: ${Math.round(m * 10) / 10} % of the role`, ...delta };
  }
  return null;
}

/**
 * One observed value of the interview sheet (§ 15.3): the value (a choice, a number or text) with its unit and period, what the model says next to it,
 * the value the scope inherits, then its source, date and confidence. A new value takes the defaults of an interview (source Interview, today).
 * Clearing the value removes the observation.
 */
export function FieldCard({ id, field, obs, role, roleName, row, inherited, inheritedFrom }: {
  id: string; field: AuditField; obs?: Observation; role?: string; roleName?: string; row?: ActivityAudit; inherited?: Observation; inheritedFrom?: string;
}) {
  const label = `${field.label}${roleName ? ` — ${roleName}` : ''}`;
  const write = (patch: Partial<Observation>) => {
    const next: Observation = { name: field.name, value: '', ...(role ? { role } : {}), ...(obs ?? {}), ...patch };
    if (!next.value.trim()) { if (obs) editAudit(id, { kind: 'removeObservation', name: field.name, ...(role ? { role } : {}) }); return; }
    if (!obs) { next.date ??= today(); next.source ??= 'interview'; }
    if (!editAudit(id, { kind: 'observation', obs: next })) toast(`${label}: value refused${field.kind === 'percent' ? ' (0 to 100)' : ''}`);
  };
  const undef = (v: string) => v || undefined;
  const ref = modelRef(field, row, obs?.value ?? '', role);
  const showInherited = inherited && inherited.value !== obs?.value;
  return (
    <li className="ac-audit-field" data-filled={!!obs || undefined}>
      <div className="ac-audit-field-label">
        <strong>{label}</strong>
        {field.unit && <span className="ac-muted">{field.unit}</span>}
      </div>
      <div className="ac-audit-field-value">
        {field.kind === 'choice'
          ? <select aria-label={label} value={obs?.value ?? ''} onChange={(e) => write({ value: e.target.value })}>
            <option value="">—</option>{(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          : <DraftText label={label} value={obs?.value ?? ''} placeholder={inherited?.value ?? '—'} onCommit={(v) => write({ value: v })} />}
        {field.period && <select aria-label={`${label}: period`} value={obs?.per ?? ''} disabled={!obs}
          onChange={(e) => write({ per: undef(e.target.value) as Observation['per'] })}>
          <option value="">per…</option>{PERIODS.map((v) => <option key={v} value={v}>per {v}</option>)}
        </select>}
        <div className="ac-audit-field-ref">
          {ref && <span>{ref.text}</span>}
          {ref?.delta && <strong data-off={ref.off || undefined}>{ref.delta}</strong>}
          {showInherited && <span>{inheritedFrom ?? 'Inherited'}: {inherited.value}{inherited.per ? ` per ${inherited.per}` : ''}</span>}
        </div>
      </div>
      <div className="ac-audit-field-prov">
        <select aria-label={`${label}: source`} value={obs?.source ?? ''} disabled={!obs}
          onChange={(e) => write({ source: undef(e.target.value) as Observation['source'] })}>
          <option value="">Source…</option>{SOURCES.map((v) => <option key={v} value={v}>{SOURCE_LABELS[v] ?? v}</option>)}
        </select>
        <input type="date" aria-label={`${label}: date`} value={obs?.date ?? ''} disabled={!obs} onChange={(e) => write({ date: undef(e.target.value) })} />
        <div role="group" aria-label={`${label}: confidence`} className="ac-audit-seg ac-audit-seg-sm">
          {CONFIDENCES.map((c) => (
            <button key={c} type="button" disabled={!obs} aria-pressed={obs?.confidence === c}
              onClick={() => write({ confidence: obs?.confidence === c ? undefined : c })}>{CONF_LABEL[c]}</button>
          ))}
        </div>
      </div>
    </li>
  );
}
