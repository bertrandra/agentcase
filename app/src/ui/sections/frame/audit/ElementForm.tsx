import { editAudit, today } from '@/controllers/audit';
import { AUDIT_BLOCKS, AUDIT_STATUSES, emptyAudit, interfaceFacts, type AuditBlock, type AuditStatus } from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';
import { STATUS_LABELS } from './Header';
import { Block } from './Observations';
import { PainEvidence } from './PainEvidence';
import { Tools } from './Tools';

/**
 * The audit form of one activity or role (F-B31, § 15.3): its status, the tools in use (proposed from the catalogue for its capability), the
 * blocks of observed values, pain points and evidence. Each change is one undoable command; nothing here changes a figure (D-B11).
 */
export function ElementForm({ data, id, title, capability, blocks = AUDIT_BLOCKS.filter((b) => b !== 'opportunity') }:
  { data: AuditViewData; id: string; title: string; capability?: string; blocks?: readonly AuditBlock[] }) {
  const a = data.audit.elements.get(id) ?? emptyAudit(id);
  const status = (s: string) => editAudit(id, { kind: 'status', ...(s ? { status: s as AuditStatus, asOf: today() } : {}) });
  return (
    <section className="ac-audit-form" aria-labelledby={`ac-audit-${id}-h`}>
      <h2 id={`ac-audit-${id}-h`}>Audit of {title}</h2>
      <div className="ac-form-row">
        <label>Status{' '}
          <select value={a.status ?? ''} onChange={(e) => status(e.target.value)}>
            <option value="">—</option>{AUDIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        {a.asOf && <span className="ac-muted">as of {a.asOf}</span>}
      </div>
      <Tools data={data} id={id} uses={a.tools} capability={capability} />
      {blocks.map((b) => (
        <Block key={b} block={b} id={id} observations={a.observations} roles={data.actors} note={b === 'flow' ? flowNote(data, id) : undefined} />
      ))}
      <Block block="opportunity" id={id} observations={a.observations} roles={data.actors} />
      <PainEvidence id={id} audit={a} interviews={data.audit.header?.interviews ?? []} />
    </section>
  );
}

/** FX-33 (F-B55): the hand-offs and interfaces the process models for the element, next to what the interviews observe. */
function flowNote(data: AuditViewData, id: string): string | undefined {
  const f = interfaceFacts(data.doc, id);
  if (!f.handoffs && !f.pools.length) return undefined;
  return `Modelled: ${f.handoffs} hand-off(s)${f.pools.length ? ` with ${f.pools.join(', ')}` : ''} (message flows of the process).`;
}
