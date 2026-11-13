import { useId, useState } from 'react';
import { AUDIT_FIELDS, BLOCK_LABELS, emptyAudit, interfaceFacts, type ActivityAudit, type AuditBlock } from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';
import { FieldCard } from './FieldCard';
import type { SheetPart } from './view';

/** The questions to ask for each part of the sheet (a guide for the auditor, never stored). */
const PROMPTS: Record<SheetPart, string[]> = {
  readiness: ['What does the tool automate today, and how?', 'Can an agent read the data it needs (structured, through an API)?',
    'Which security or regulatory rule limits the use of AI here?'],
  volume: ['How many items go through per week or per sprint?', 'Do they come in batches? How large?'],
  time: ['How long does one item take, hands on?', 'How long from start to done, and how much of it is waiting?', 'Who does it: the share of each role?'],
  quality: ['How often is an item reworked or sent back?', 'How many review rounds before it is accepted?', 'What escapes to the next phase?'],
  flow: ['Who hands the work over to whom?', 'Which approvals are needed?', 'Where is data copied by hand between tools?'],
  people: ['How many people are involved, in which roles?', 'Which skills are missing?', 'How open is the team to changing the way it works?'],
  opportunity: ['What would you change first?', 'What should the auditor note that the fields do not hold?'],
  tools: ['Which tools are used on this activity, which version?', 'Are AI features switched on? Through which integration?'],
  pain: ['What slows you down or causes errors?', 'Which document or export supports what was said?'],
};
export const PART_LABEL = (p: SheetPart): string => (p === 'tools' ? 'Tools in use' : p === 'pain' ? 'Pain points and evidence' : BLOCK_LABELS[p]);
export const PARTS: SheetPart[] = ['readiness', 'volume', 'time', 'quality', 'flow', 'people', 'opportunity', 'tools', 'pain'];

/** The fields of a block and, for a per-role field, the roles that hold a value (plus one added by the auditor). */
export function BlockFields({ data, id, block, row }: { data: AuditViewData; id: string; block: AuditBlock; row: ActivityAudit | undefined }) {
  const [role, setRole] = useState(''), a = data.audit.elements.get(id) ?? emptyAudit(id), fields = AUDIT_FIELDS.filter((f) => f.block === block);
  const inh = data.scope.own ? data.scope.inherited.get(id) : undefined;
  const roles = data.actors.filter((r) => r.kind !== 'agent'), name = (r: string) => data.actors.find((x) => x.id === r)?.name ?? r;
  const perRole = fields.filter((f) => f.perRole);
  const shown = [...new Set([...a.observations.filter((o) => o.role && perRole.some((f) => f.name === o.name)).map((o) => o.role!), ...(role ? [role] : [])])];
  return (
    <>
      <ul className="ac-audit-fields">
        {fields.map((f) => <FieldCard key={f.name} id={id} field={f} row={row} obs={a.observations.find((o) => o.name === f.name && !o.role)}
          inherited={inh?.observations.find((o) => o.name === f.name && !o.role)} inheritedFrom={data.scope.inheritedFrom} />)}
        {shown.flatMap((r) => perRole.map((f) => <FieldCard key={`${f.name}-${r}`} id={id} field={f} role={r} roleName={name(r)} row={row}
          obs={a.observations.find((o) => o.name === f.name && o.role === r)} inherited={inh?.observations.find((o) => o.name === f.name && o.role === r)}
          inheritedFrom={data.scope.inheritedFrom} />))}
      </ul>
      {perRole.length > 0 && (
        <label className="ac-audit-split-role">Split per role{' '}
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label={`${BLOCK_LABELS[block]}: add a value for a role`}>
            <option value="">— choose a role —</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
      )}
    </>
  );
}

/** How many fields of a block hold a value (the per-role values count once per field). */
export const filled = (data: AuditViewData, id: string, b: AuditBlock): [number, number] => {
  const fs = AUDIT_FIELDS.filter((f) => f.block === b), obs = data.audit.elements.get(id)?.observations ?? [];
  return [fs.filter((f) => obs.some((o) => o.name === f.name)).length, fs.length];
};

/** The side of the sheet: what the model holds on the activity (and whether the scope has its own audit of it), the questions to ask. */
export function SheetContext({ data, act, row, part }: { data: AuditViewData; act: string; row: ActivityAudit; part: SheetPart }) {
  const id = useId(), flow = interfaceFacts(data.doc, act);
  return (
    <aside className="ac-audit-side" aria-label="Context of the activity">
      <section className="ac-audit-card" aria-labelledby={`${id}-m`}>
        <h2 id={`${id}-m`}>What the model holds</h2>
        <dl className="ac-audit-dl">
          <dt>Phase</dt><dd>{row.phase}</dd>
          <dt>Capability</dt><dd>{row.capability || '—'}</dd>
          <dt>Effort (model weight)</dt><dd>{row.effort}</dd>
          <dt>AI authority</dt><dd>{row.aiAuthority}</dd>
          <dt>Rework</dt><dd>{row.reworkFlows.length ? row.reworkFlows.map((f) => `${Math.round(f.probability * 100)} %`).join(', ') : '—'}</dd>
          <dt>Hand-offs</dt><dd>{flow.handoffs}{flow.pools.length ? ` (${flow.pools.join(', ')})` : ''}</dd>
          <dt>Observed h/month</dt><dd>{row.hoursPerMonth ?? '—'}</dd>
        </dl>
        {row.hoursFormula && <p className="ac-audit-formula">{row.hoursFormula}</p>}
        {data.scope.own && <p className="ac-muted">{data.scope.own.has(act) ? `${data.scope.name} holds its own audit of ${act}.`
          : `Nothing recorded for ${data.scope.name} yet: the values shown come from ${data.scope.inheritedFrom}.`}</p>}
      </section>
      <section className="ac-audit-card ac-audit-prompts" aria-labelledby={`${id}-q`}>
        <h2 id={`${id}-q`}>Questions to ask</h2>
        <ul>{PROMPTS[part].map((q) => <li key={q}>{q}</li>)}</ul>
      </section>
    </aside>
  );
}
