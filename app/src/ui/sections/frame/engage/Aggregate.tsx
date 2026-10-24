import type { EngageRow } from '@/domain/portfolio';
import { useFrameEngage } from '@/store/selectionHooksFrame';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { fmtRange, InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const, STAGES = ['Discover', 'Calibrate', 'Validate', 'Pilot & Prove'];
const COLS: AggColumn<EngageRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  ...STAGES.map((s, i) => ({ key: `s${i}`, header: `${s} (wk)`, align: R, render: (r: EngageRow) => r.weeks[i] ?? '' })),
  { key: 'total', header: 'Runway to decision', align: R, render: (r) => `${r.totalWeeks} wk (${r.months} mo)` },
  { key: 'pilot', header: 'Pilot & Prove starts', render: (r) => r.pilotStart },
  { key: 'decide', header: 'Decide & Scale', render: (r) => r.decide },
];

const help = <p>Aggregate view of the client onboarding runway: the four consecutive stages (Discover, Calibrate, Validate, Pilot &amp; Prove) of each product
  and the date the scale-out decision is taken. The start date is common to all products.</p>;

/** Engage — Aggregate view: the onboarding stage durations and decision date of each product, with the range across the selection. */
export default function EngageAggregate() {
  const a = useFrameEngage(), vs = useViewScope();
  return (
    <InputAggregate title="🤝 Engage — starting early with the client" help={help} intro="the onboarding durations belong to each product.">
      <StatRow>
        <Stat label="Runway to decision (min – max)" value={fmtRange(a.totalWeeks, 0, ' wk')} tone="teal" />
        <Stat label="Earliest decision" value={a.earliestDecide || '—'} tone="amber" />
        <Stat label="Latest decision" value={a.latestDecide || '—'} tone="brick" />
      </StatRow>
      <AggregateTable caption={`Onboarding runway by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Range (min – max) — ${vs.label}`, cells: { total: fmtRange(a.totalWeeks, 0, ' wk'), decide: `${a.earliestDecide} → ${a.latestDecide}` } }} />
    </InputAggregate>
  );
}
