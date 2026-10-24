import type { LifecycleRow } from '@/domain/portfolio';
import { useScopeLifecycle } from '@/store/selectionHooksScope';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { fmtRange, InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const;
const COLS: AggColumn<LifecycleRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'use', header: 'Weighting', render: (r) => (r.use ? 'on' : 'off (neutral)') },
  { key: 'pos', header: 'Lifecycle position', align: R, title: '0 = greenfield, 100 = legacy in maintenance', render: (r) => `${r.pos.toFixed(0)}/100` },
  { key: 'status', header: 'Blended status', render: (r) => r.label },
  { key: 'posture', header: 'Automation posture', align: R, title: 'Global factor applied to the effective depth (×1.00 when off)', render: (r) => `×${r.posture.toFixed(2)}` },
];

const help = <p>Aggregate view of where each product sits on its lifecycle. The position re-weights the effort of every SDLC phase and sets the automation
  posture; the last line gives the number of products using the weighting and the posture range.</p>;

/** Product status lifecycle weighting — Aggregate view: the lifecycle position, blended status and posture of each product. */
export default function LcWeightingAggregate() {
  const a = useScopeLifecycle(), vs = useViewScope();
  return (
    <InputAggregate title="📊 Product status lifecycle weighting" help={help} intro="the lifecycle position belongs to each product.">
      <StatRow>
        <Stat label="Products using the weighting" value={`${a.using}/${a.rows.length}`} />
        <Stat label="Automation posture (min – max)" value={`×${fmtRange(a.posture, 2)}`} tone="teal" />
      </StatRow>
      <AggregateTable caption={`Lifecycle weighting by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Total — ${vs.label}`, cells: { use: `${a.using}/${a.rows.length} on`, posture: `×${fmtRange(a.posture, 2)}` } }} />
    </InputAggregate>
  );
}
