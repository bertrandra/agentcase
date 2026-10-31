import { fmtK } from '@/domain/format';
import type { PlanViews } from '@/domain/programme/planBundle';
import { fmt1 } from '@/ui/economicsFormat';
import { openActivity } from '@/ui/widgets/ActivityRefs';
import { DataTable } from '@/ui/widgets/DataTable';
import './plan.css';

const KIND = { programme: 'Programme', group: 'Stage / wave', product: 'Product', package: 'Work package' } as const;
const open = (id: string, name: string) => (
  <button type="button" className="ac-link" onClick={() => openActivity(id)} aria-label={`Open ${name} in Process`}>{name}</button>
);

/**
 * The WBS and its dictionary (docs/SPEC_BPMN.md § 19.8 F-B74, D-B35; phase B9d): the tree of the programme process (programme, engagement
 * stages / waves, products, work packages) with its codes — an override entered in the Process section's panel is marked — and per work
 * package its deliverable, Accountable, roles, effort, cost, duration, dates and predecessors. A view: every work package opens its activity.
 */
export function WbsTab({ v }: { v: PlanViews }) {
  return (
    <section className="ac-panel" aria-label="Work breakdown structure">
      <h2>Work breakdown structure <small className="ac-muted">— phase / wave-oriented, a named deliverable per work package (D-B35)</small></h2>
      <p className="ac-muted">Derived from the programme process (a documented mapping, not a standard conversion): level 1 the programme, level 2 the
        engagement stages and each wave, level 3 the product, level 4 the work package. Codes follow the tree; a code entered in an activity&apos;s
        panel (Process section) replaces its own.</p>
      <DataTable caption="WBS" rows={v.wbs} rowKey={(n) => `${n.derived}:${n.name}`} columns={[
        { key: 'code', header: 'Code', render: (n) => (n.overridden ? <span title={`Derived code ${n.derived}`}>{`${n.code} (entered)`}</span> : n.code) },
        { key: 'name', header: 'Element',
          render: (n) => <span className={`ac-plan-indent-${Math.min(5, n.level)}`}>{n.task ? open(n.task.activity, n.name) : n.name}</span> },
        { key: 'kind', header: 'Level', render: (n) => `${n.level} · ${KIND[n.kind]}${n.task?.milestone ? ' (milestone)' : ''}` },
        { key: 'dup', header: 'Note', render: (n) => (n.duplicate ? 'Entered code repeats another: the derived code is kept' : '') },
      ]} />
      <h3>WBS dictionary</h3>
      <DataTable caption="WBS dictionary" rows={v.dictionary} rowKey={(d) => d.code} columns={[
        { key: 'code', header: 'Code', render: (d) => d.code }, { key: 'name', header: 'Work package', render: (d) => open(d.activity, d.name) },
        { key: 'desc', header: 'Description', render: (d) => d.description }, { key: 'del', header: 'Deliverable', render: (d) => d.deliverable },
        { key: 'acc', header: 'Accountable', render: (d) => d.accountable }, { key: 'roles', header: 'Roles', render: (d) => d.roles },
        { key: 'eff', header: 'Effort (days)', align: 'right', render: (d) => (d.effortDays === null ? '—' : fmt1(d.effortDays)) },
        { key: 'cost', header: 'Cost', align: 'right', render: (d) => (d.cost === null ? '—' : `${fmtK(d.cost)}${d.costPer === 'year 1' ? ' / yr 1' : ''}`) },
        { key: 'dur', header: 'Months', align: 'right', render: (d) => (d.milestone ? '—' : fmt1(d.months)) },
        { key: 'start', header: 'Start', render: (d) => d.start }, { key: 'finish', header: 'Finish', render: (d) => d.finish },
        { key: 'pred', header: 'Predecessors', render: (d) => d.predecessors || '—' },
      ]} />
    </section>
  );
}
