import type { PlanViews } from '@/domain/programme/planBundle';
import { fmt1 } from '@/ui/economicsFormat';
import { openActivity } from '@/ui/widgets/ActivityRefs';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import type { RamRow } from '@/domain/programme/ram';
import './plan.css';

const KIND = { organisation: 'Organisation', unit: 'Unit', team: 'Team', role: 'Role', programmeRole: 'Operating-model role', agent: 'Agent',
  branch: 'Branch' } as const;

/**
 * OBS and RAM (docs/SPEC_BPMN.md § 19.8 F-B75; phase B9d): the organisation model's units → teams → roles, the transformation team's
 * operating-model roles and the agents; the responsibility assignment matrix of the WBS work packages × those roles with the programme's RACI
 * letters, and the F-B36 checks (no Responsible, several Accountable, no Accountable, unknown role) on each row.
 */
export function ObsTab({ v }: { v: PlanViews }) {
  const findings = v.ram.rows.flatMap((r) => r.findings);
  const cols: Column<RamRow>[] = [
    { key: 'code', header: 'WBS', render: (r) => r.code },
    { key: 'name', header: 'Work package', render: (r) => <button type="button" className="ac-link" onClick={() => openActivity(r.activity)}
      aria-label={`Open ${r.name} in Process`}>{r.name}</button> },
    ...v.ram.columns.map((c): Column<RamRow> => ({ key: c.id, header: c.name, align: 'center', render: (r) => (r.cells[c.id] ?? []).join(', ') })),
    { key: 'check', header: 'Checks (F-B36)', render: (r) => (r.findings.length ? r.findings.map((f) => f.message).join('; ') : 'OK') },
  ];
  return (
    <section className="ac-panel" aria-label="OBS and RAM">
      <h2>Organisation breakdown structure</h2>
      <DataTable caption="OBS" rows={v.obs} rowKey={(n) => n.code} columns={[
        { key: 'code', header: 'Code', render: (n) => n.code },
        { key: 'name', header: 'Element', render: (n) => <span className={`ac-plan-indent-${Math.min(5, n.level)}`}>{n.name}</span> },
        { key: 'kind', header: 'Kind', render: (n) => KIND[n.kind] },
        { key: 'fte', header: 'FTE', align: 'right', render: (n) => (n.fte === null ? '—' : fmt1(n.fte)) },
      ]} />
      <h2>Responsibility assignment matrix (RAM)</h2>
      <p className="ac-muted">Work packages × roles: R Responsible, A Accountable, C Consulted, I Informed — the RACI of each programme activity, edited in
        the Process section. {findings.length ? `${findings.length} finding(s) of the RACI checks.` : 'The RACI checks find nothing.'}</p>
      <DataTable caption="RAM" rows={v.ram.rows} rowKey={(r) => r.code} columns={cols} />
    </section>
  );
}
