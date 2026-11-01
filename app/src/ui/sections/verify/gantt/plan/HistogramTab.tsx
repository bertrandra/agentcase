import { useId, useState } from 'react';
import { fteOf, regroup, type HistSeries } from '@/domain/programme/histogram';
import { laneGroupOf, laneRolesOf, type HistGroupBy } from '@/domain/org';
import type { XDocument } from '@/domain/process';
import { useOrg } from '@/store/orgHooks';
import { usePortfolio } from '@/store/hooks';
import type { PlanViews } from '@/domain/programme/planBundle';
import { fmt1 } from '@/ui/economicsFormat';
import { DataTable } from '@/ui/widgets/DataTable';
import { HistogramChart, toneOf } from './HistogramChart';
import { DeliveryView } from './DeliveryView';
import './plan.css';

type Unit = 'fte' | 'days';

/**
 * The resource histogram (docs/SPEC_BPMN.md § 19.8 F-B76, D-B34, D-B37; phase B9d): the programme's labour per month stacked by role, read from
 * its cost profile (`domain/programme/histogram.ts`, the one owner), in FTE (default) or person-days; the capacity line (the roles' operating-model
 * FTE) and the over-allocation flags (diagnostics only, no levelling); the table alternative of the chart; and, for the Product scope, the delivery
 * process's FTE before / after agents per role, read from the engine. The unit is view state, never part of the case.
 */
export function HistogramTab({ v }: { v: PlanViews }) {
  const [unit, setUnit] = useState<Unit>('fte'), [by, setBy] = useState<HistGroupBy>('role'), h = v.histogram, name = useId(), byName = useId();
  // FX-16: the roles grouped by the team, unit or location that staffs them (the programme roles mapped in 🏢 Organisation)
  const m = useOrg(), common = usePortfolio((p) => p.common.BPMN as XDocument), productId = usePortfolio((p) => p.activeProductId);
  const series: HistSeries[] = by === 'role' ? h.roles.map((r) => ({ key: r.lane, label: r.label, days: r.days }))
    : regroup(h.roles, laneGroupOf(m, laneRolesOf(common), productId, by));
  const scale = unit === 'fte' ? 1 / h.wdMonth : 1, label = unit === 'fte' ? 'FTE' : 'person-days';
  const caps = h.roles.map((r) => r.capacity).filter((x): x is number => x !== null);
  const capacity = caps.length ? caps.reduce((a, b) => a + b, 0) * (unit === 'fte' ? 1 : h.wdMonth) : null;
  const months = Array.from({ length: h.to - h.from + 1 }, (_, i) => i).filter((i) => h.roles.some((r) => r.days[i]! > 1e-9));
  const val = (d: number) => fmt1(unit === 'fte' ? fteOf(d, h.wdMonth) : d);
  const summary = `Programme labour per month by role in ${label}, ${months.length} month(s) with labour; `
    + `capacity ${capacity === null ? 'not set' : fmt1(capacity)}`;
  return (
    <section className="ac-panel" aria-label="Resource histogram">
      <h2>Resource histogram <small className="ac-muted">— the programme&apos;s labour per month, by role</small></h2>
      <fieldset className="ac-plan-tools">
        <legend>Unit</legend>
        {(['fte', 'days'] as const).map((u) => (
          <label key={u}>
            <input type="radio" name={name} checked={unit === u} onChange={() => setUnit(u)} />{u === 'fte' ? ' FTE (default)' : ' Person-days'}
          </label>
        ))}
      </fieldset>
      <fieldset className="ac-plan-tools">
        <legend>Group by</legend>
        {(['role', 'team', 'unit', 'location'] as const).map((g) => (
          <label key={g}><input type="radio" name={byName} checked={by === g} onChange={() => setBy(g)} />{` ${g[0]!.toUpperCase()}${g.slice(1)}`}</label>
        ))}
      </fieldset>
      <HistogramChart roles={series} from={h.from} scale={scale} capacity={by === 'role' ? capacity : null} unit={label} summary={summary} />
      <ul className="ac-plan-legend" aria-label={by === 'role' ? 'Roles' : `Groups (by ${by})`}>
        {series.map((r, k) => (
          <li key={r.key}>
            <svg className="ac-plan-swatch" viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10" fill={`var(--ac-${toneOf(r.key, k)})`} /></svg>
            {r.label}
          </li>
        ))}
        {capacity !== null && by === 'role' && <li>- - capacity (operating-model FTE of these roles)</li>}
      </ul>
      {h.flags.length + v.setupFlags.length > 0
        ? <ul aria-label="Over-allocation flags">{[...h.flags.map((f) => `${f.label}: ${fmt1(f.fte)} FTE in month ${f.month}, capacity ${fmt1(f.capacity)}`),
          ...v.setupFlags.map((f) => `Month ${f.month}: ${f.inSetup} products in setup, the transformation team takes ${f.capacity}`)].slice(0, 30)
          .map((t) => <li key={t} className="ac-plan-flag">{`⚠ ${t}`}</li>)}</ul>
        : <p className="ac-muted">No over-allocation: every role stays within its capacity.</p>}
      <p className="ac-muted">Flags are diagnostics only (D-B37): nothing is moved; an activity moves only when its placement is edited in the Process
        section. Months are the product&apos;s own (1 = the build&apos;s first month){v.scope.kind === 'product' ? '' : ', on the portfolio calendar'}.</p>
      <DataTable caption={`Programme labour per month (${label})`} rows={months} rowKey={(i) => String(i)} columns={[
        { key: 'm', header: 'Month', render: (i) => `M${h.from + i}` },
        ...series.map((r) => ({ key: r.key, header: r.label, align: 'right' as const, render: (i: number) => val(r.days[i]!) })),
        { key: 't', header: 'Total', align: 'right', render: (i) => val(h.roles.reduce((s, r) => s + r.days[i]!, 0)) },
      ]} />
      {v.delivery && <DeliveryView d={v.delivery} />}
    </section>
  );
}
