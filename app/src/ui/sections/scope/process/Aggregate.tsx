import type { ProcessRow } from '@/domain/portfolio/aggProcess';
import { useScopeProcess } from '@/store/selectionHooksProcess';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const;
const COLS: AggColumn<ProcessRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'own', header: 'Process', render: (r) => (r.own ? 'own (overridden)' : 'common') },
  { key: 'act', header: 'Activities', align: R, render: (r) => String(r.activities) },
  { key: 'in', header: 'Marked in scope', align: R, render: (r) => String(r.inScope) },
  { key: 'custom', header: 'Not in the default process', align: R, render: (r) => String(r.custom) },
  { key: 'actors', header: 'Actors', align: R, render: (r) => String(r.actors) },
];
const help = <p>Aggregate view of the process of each product: whether it uses the common process or its own, how many activities it holds and marks in
  scope, how many are not in the default process (added or imported), and its actors.</p>;

/** 🧩 Process (BPMN) — Aggregate view: the process of each product in counts. */
export default function ProcessAggregate() {
  const a = useScopeProcess(), vs = useViewScope(), n = a.rows.length;
  return (
    <InputAggregate title="🧩 Process (BPMN)" help={help} intro="the process belongs to the common case unless a product overrides it.">
      <StatRow>
        <Stat label="Products with their own process" value={`${a.own}/${n}`} />
        <Stat label="Products with added activities" value={`${a.custom}/${n}`} tone={a.custom ? 'amber' : 'teal'} />
      </StatRow>
      <AggregateTable caption={`Process by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Products — ${vs.label}`, cells: { own: `${a.own}/${n} own`, custom: `${a.custom}/${n} with added activities` } }} />
    </InputAggregate>
  );
}
