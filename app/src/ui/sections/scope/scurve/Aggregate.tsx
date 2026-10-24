import type { ScurveRow } from '@/domain/portfolio';
import { useScopeScurve } from '@/store/selectionHooksScope';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { fmtRange, InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const;
const month = (m: number | null) => (m == null ? 'beyond horizon' : `month ${m}`);
const COLS: AggColumn<ScurveRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'family', header: 'Curve family', render: (r) => r.family },
  { key: 'points', header: 'Control points', align: R, render: (r) => r.points },
  { key: 'y1', header: 'Year 1', align: R, title: 'Adoption (%) reached at month 12', render: (r) => `${r.y1}%` },
  { key: 'y2', header: 'Year 2', align: R, title: 'Adoption (%) reached at month 24', render: (r) => `${r.y2}%` },
  { key: 'y3', header: 'Year 3', align: R, title: 'Adoption (%) reached at month 36', render: (r) => `${r.y3}%` },
  { key: 'l2', header: 'Reaches L2', render: (r) => month(r.l2Month) },
  { key: 'l4', header: 'Reaches L4', render: (r) => month(r.l4Month) },
  { key: 'end', header: 'Adoption at horizon end', align: R, render: (r) => `${r.endAdoption}% (${r.endMaturity})` },
];

const help = <p>Aggregate view of the adoption ramp of each product: the curve family, its Year 1 / 2 / 3 anchors, the month it crosses the maturity levels and the adoption reached at the end of the horizon. The horizon is common to all products.</p>;

/** S-curve — adoption ramp — Aggregate view: the curve of each product (family, anchors, key points) and the range of the adoption at the horizon end. */
export default function ScurveAggregate() {
  const a = useScopeScurve(), vs = useViewScope();
  return (
    <InputAggregate title="📊 S-curve — adoption ramp" help={help} intro="the adoption curve belongs to each product.">
      <StatRow>
        <Stat label="Adoption at horizon end (min – max)" value={fmtRange(a.endAdoption, 0, '%')} tone="teal" />
        {a.families.map((f) => <Stat key={f.family} label={`Curve family: ${f.family}`} value={`${f.count} product${f.count > 1 ? 's' : ''}`} />)}
      </StatRow>
      <AggregateTable caption={`Adoption curve by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Range (min – max) — ${vs.label}`, cells: { end: fmtRange(a.endAdoption, 0, '%') } }} />
    </InputAggregate>
  );
}
