import type { DeliveryHistogram } from '@/domain/programme/histogramDelivery';
import { fmt1 } from '@/ui/economicsFormat';
import { DataTable } from '@/ui/widgets/DataTable';

/**
 * The delivery view of the resource histogram (docs/SPEC_BPMN.md § 19.8 F-B76; phase B9d): FTE before agents (the entry team, the capacity
 * line) and after, per role and per month, read from the Time Engine (`domain/programme/histogramDelivery.ts`), with the agentic run team and the
 * agents' vFTE. Shown as a table (months in rows, collapsed by default: a long horizon has many months).
 */
export function DeliveryView({ d }: { d: DeliveryHistogram }) {
  const months = Array.from({ length: d.months }, (_, i) => i);
  return (
    <>
      <h3>Delivery process: FTE before / after agents, per role (read from the engine)</h3>
      <DataTable caption="Entry team (before agents): the capacity per role" rows={d.roles} rowKey={(r) => r.role} columns={[
        { key: 'role', header: 'Role', render: (r) => r.role }, { key: 'before', header: 'FTE before', align: 'right', render: (r) => fmt1(r.before) },
        { key: 'end', header: 'FTE after (horizon end)', align: 'right', render: (r) => fmt1(r.after.at(-1) ?? 0) },
      ]} />
      {d.flags.length > 0 && <p className="ac-plan-flag">{`⚠ ${d.flags.length} month(s) where a role needs more than its entry FTE.`}</p>}
      <details>
        <summary>Month by month</summary>
        <DataTable caption="Delivery FTE after agents, per month" rows={months} rowKey={(i) => String(i)} columns={[
          { key: 'm', header: 'Month', render: (i) => `M${i + 1}` },
          ...d.roles.map((r) => ({ key: r.role, header: r.role, align: 'right' as const, render: (i: number) => fmt1(r.after[i]!) })),
          { key: 'run', header: 'Agentic run team', align: 'right', render: (i) => fmt1(d.runTeam[i]!) },
          { key: 'ag', header: 'Agents (vFTE)', align: 'right', render: (i) => fmt1(d.agents[i]!) },
        ]} />
      </details>
    </>
  );
}
