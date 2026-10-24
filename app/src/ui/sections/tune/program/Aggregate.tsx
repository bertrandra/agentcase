import type { ProgramRow } from '@/domain/portfolio';
import { useProgramAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn, waveColumn } from '@/ui/widgets/AggregateTable';
import { eurK } from '../../tuneB/fmt';
import { InputAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';

const R = 'right' as const;
const COLS: AggColumn<ProgramRow>[] = [
  waveColumn(),
  { key: 'fte', header: 'Pilot FTE', align: R, render: (r) => r.pilotFte.toFixed(1) },
  { key: 'weeks', header: 'Pilot weeks', align: R, title: 'Prove weeks + break-in sprints', render: (r) => r.pilotWeeks },
  { key: 'pcost', header: 'Pilot cost', align: R, render: (r) => eurK(r.pilotCost) },
  { key: 'ops', header: 'Capability: operational', align: R, render: (r) => r.capOps },
  { key: 'target', header: 'Capability: target', align: R, render: (r) => r.capTarget },
  { key: 'pct', header: 'Capability reached', align: R, render: (r) => `${r.capPct}%` },
  { key: 'pods', header: 'Pods (Y3)', align: R, render: (r) => r.pods },
  { key: 'over', header: 'Multi-pod overhead', align: R, render: (r) => `${r.overheadPct}%` },
];

/** Program & Completeness — Aggregate view: pilot sizing, internal capability and multi-pod overhead of each product (read-only), with the spread over the selection. */
export default function ProgramAggregate() {
  const a = useProgramAgg(), vs = useViewScope(), t = a.totals;
  const items: SpreadItem[] = [
    { id: 'pilot', name: 'Pilot cost', s: a.pilotCost, f: eurK },
    { id: 'over', name: 'Multi-pod overhead (%)', s: a.overhead, f: (v) => v.toFixed(1) },
  ];
  return (
    <InputAggregate title="🧭 Program & Completeness" intro="the pilot, the internal capability and the multi-pod overhead belong to each product.">
      <AggregateTable caption={`Programme inputs by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Total — ${vs.label}`, cells: { fte: t.pilotFte.toFixed(1), pcost: eurK(t.pilotCost), ops: t.capOps, target: t.capTarget, pct: `${t.capPct}%` } }} />
      <SpreadTable caption={`Spread of the programme inputs — ${vs.label}`} items={items} />
    </InputAggregate>
  );
}
