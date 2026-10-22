import type { RunSizingRow } from '@/domain/portfolio';
import { useRunSizingAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { eur, fix } from '../../tuneB/fmt';
import { InputAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';

const R = 'right' as const;
const COLS: AggColumn<RunSizingRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'mode', header: 'Mode', render: (r) => r.mode },
  { key: 'floor', header: 'Floor min (FTE)', align: R, render: (r) => fix(r.floorMin, 1) },
  { key: 'pct', header: 'Floor (% of base)', align: R, render: (r) => fix(r.floorPct, 1) },
  { key: 'ops', header: 'Ops load / agent', align: R, render: (r) => fix(r.opsPerAgent, 2) },
  { key: 'sup', header: 'Supervision cap × factor', align: R, render: (r) => `${fix(r.supCap, 2)} × ${fix(r.supFactor, 2)}` },
  { key: 'fte', header: 'Run team, end (FTE)', align: R, title: 'At the end of the product’s own horizon', render: (r) => fix(r.runFte, 2) },
  { key: 'per', header: 'Agents per run FTE', align: R, render: (r) => (r.agentsPerFte == null ? '—' : fix(r.agentsPerFte, 1)) },
  { key: 'cost', header: 'Run team cost, end year', align: R, render: (r) => eur(r.runCost) },
];

/** Agentic run-team sizing — Aggregate view: the sizing policy of each product and what it gives (read-only); min / max / average of the key inputs. */
export default function RunSizingAggregate() {
  const a = useRunSizingAgg(), vs = useViewScope(), t = a.totals;
  const items: SpreadItem[] = [
    { id: 'fte', name: 'Run team, end of horizon (FTE)', s: a.runFte, f: (v) => fix(v, 2) },
    { id: 'ops', name: 'Ops load per agent vFTE', s: a.opsPerAgent, f: (v) => fix(v, 2) },
    { id: 'floor', name: 'Platform floor min (FTE)', s: a.floorMin, f: (v) => fix(v, 1) },
  ];
  return (
    <InputAggregate title="🤖 Agentic run-team sizing" intro="the run-team sizing policy belongs to each product.">
      <AggregateTable caption={`Run-team sizing by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Total — ${vs.label}`, cells: { fte: fix(t.runFte, 2), cost: eur(t.runCost) } }} />
      <p className="ac-muted">End-of-horizon figures of each product, added up as they are (each product’s own last year).</p>
      <SpreadTable caption={`Spread of the sizing inputs — ${vs.label}`} items={items} />
    </InputAggregate>
  );
}
