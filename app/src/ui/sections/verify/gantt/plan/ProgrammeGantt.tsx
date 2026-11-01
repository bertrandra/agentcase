import type { PlanViews } from '@/domain/programme/planBundle';
import { fmt1 } from '@/ui/economicsFormat';
import { openActivity } from '@/ui/widgets/ActivityRefs';
import { DataTable } from '@/ui/widgets/DataTable';
import { ROLE_TONE } from './HistogramChart';
import './plan.css';
import { PlanLink } from './PlanLink';


/**
 * The programme's ONE Gantt (docs/SPEC_BPMN.md § 19.8 F-B73; phase B9d): every bar and milestone of the plan of the display scope, in WBS
 * order, coloured by role, the critical path outlined (rows of their own, outside the legacy calendar's `data-gantt-row` rows); each bar is a
 * button that opens its activity in the Process section (Enter, Space or a click). The schedule table below is its accessible alternative (WBS
 * code, dates, duration, predecessors, critical).
 */
export function ProgrammeGantt({ v }: { v: PlanViews }) {
  const total = Math.max(1, ...v.plan.tasks.map((t) => t.start + t.dur)), at = (m: number) => (m / total) * 100;
  const rows = v.wbs.filter((n) => n.task), dict = new Map(v.dictionary.map((d) => [d.code, d]));
  return (
    <section className="ac-panel" aria-label="Programme Gantt">
      <h2>Programme Gantt <small className="ac-muted">— from the programme process: bars by role, milestones ◆, critical path outlined</small></h2>
      <div className="ac-plan-gantt">
        {rows.map((n) => {
          const t = n.task!, d = dict.get(n.code)!, label = `${n.code} ${t.name}`;
          const text = `${label}: ${t.milestone ? `milestone on ${d.start}` : `${d.start} to ${d.finish}, ${fmt1(d.months)} months`}`
            + `${t.critical ? ', critical' : ''}`;
          const x = at(t.start), w = t.milestone ? 0 : Math.max(0.4, at(t.dur)), fill = `var(--ac-${ROLE_TONE[t.lane]})`;
          const open = () => openActivity(t.activity);
          return (
            <div key={t.id} className="ac-gantt-row is-program">
              <div title={label} className="ac-gantt-label">{label}</div>
              <svg className="ac-plan-track" viewBox="0 0 100 14" preserveAspectRatio="none">
                <g role="button" tabIndex={0} aria-label={`Open ${text} in Process`} className={`ac-plan-bar${t.critical ? ' is-critical' : ''}`}
                  onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}>
                  <title>{text}</title>
                  {t.milestone ? <polygon points={`${x},1 ${x + 0.8},7 ${x},13 ${x - 0.8},7`} fill={fill} />
                    : <rect x={x} y={1} width={w} height={12} rx={0.5} fill={fill} />}
                </g>
              </svg>
            </div>
          );
        })}
      </div>
      <h3>Schedule</h3>
      <DataTable caption="Programme schedule (the Gantt's table)" rows={v.dictionary} rowKey={(d) => d.code} columns={[
        { key: 'code', header: 'WBS', render: (d) => d.code },
        { key: 'name', header: 'Activity', render: (d) => <PlanLink id={d.activity} name={d.name} /> },
        { key: 'start', header: 'Start', render: (d) => d.start }, { key: 'finish', header: 'Finish', render: (d) => (d.milestone ? '◆' : d.finish) },
        { key: 'months', header: 'Months', align: 'right', render: (d) => (d.milestone ? '—' : fmt1(d.months)) },
        { key: 'pred', header: 'Predecessors', render: (d) => d.predecessors || '—' },
        { key: 'crit', header: 'Critical', render: (d) => (d.critical ? 'Yes' : '') },
      ]} />
    </section>
  );
}
