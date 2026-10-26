import type { SetupRow } from '@/domain/portfolio';
import { useSetupAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn, waveColumn } from '@/ui/widgets/AggregateTable';
import { eurK } from '../../tuneB/fmt';
import { InputAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';

const R = 'right' as const;
const COLS: AggColumn<SetupRow>[] = [
  waveColumn(),
  { key: 'tooling', header: 'Tooling & infra', align: R, render: (r) => eurK(r.tooling) },
  { key: 'training', header: 'Training & change', align: R, render: (r) => eurK(r.training) },
  { key: 'coaching', header: 'Coaching', align: R, render: (r) => eurK(r.coaching) },
  { key: 'governance', header: 'Governance', align: R, render: (r) => eurK(r.governance) },
  { key: 'change', header: 'Change (HRI)', align: R, render: (r) => eurK(r.change) },
  { key: 'knowledge', header: 'Knowledge hub', align: R, render: (r) => eurK(r.knowledge) },
  { key: 'total', header: 'Total setup', align: R, render: (r) => eurK(r.total) },
  { key: 'duration', header: 'Duration (months)', align: R, render: (r) => r.duration },
];

/** Agentic Setup — Aggregate view: the one-off investment lines of each product, the summed total line and the spread of the product totals (read-only). */
export default function SetupAggregate() {
  const a = useSetupAgg(), vs = useViewScope(), t = a.totals;
  const items: SpreadItem[] = [
    { id: 'total', name: 'Total setup per product', s: a.spread, f: eurK },
    { id: 'dur', name: 'Setup duration (months)', s: a.duration, f: (v) => v.toFixed(1) },
  ];
  const cells = { tooling: eurK(t.tooling), training: eurK(t.training), coaching: eurK(t.coaching), governance: eurK(t.governance), change: eurK(t.change),
    knowledge: eurK(t.knowledge), total: eurK(t.total) };
  return (
    <InputAggregate title="Agentic Setup — Initial investment"
      intro={'the one-off setup lines belong to each product (the HRI change cost and the hub setup are computed by the model); each total is the setup the ' +
        'economics use.'}>
      <AggregateTable caption={`Setup lines by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Total — ${vs.label}`, cells }} />
      <SpreadTable caption={`Spread of the setup inputs — ${vs.label}`} items={items} />
    </InputAggregate>
  );
}
