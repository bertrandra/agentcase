import type { OpModelRow } from '@/domain/portfolio';
import { useOpModelAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { fix } from '../../tuneB/fmt';
import { RollupAggregate } from '../AggregateShared';
import OpModelSection from './index';

const R = 'right' as const;
const COLS: AggColumn<OpModelRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'pod', header: 'Pod size (FTE)', align: R, render: (r) => `${r.podSize}${r.widened ? ' (widened)' : ''}` },
  { key: 'pods1', header: 'Pods Y1', align: R, render: (r) => r.y1.pods },
  { key: 'res1', header: 'Residual team Y1', align: R, render: (r) => fix(r.y1.residual, 1) },
  { key: 'ops1', header: 'Run team Y1', align: R, render: (r) => fix(r.y1.ops, 1) },
  { key: 'tot1', header: 'Human headcount Y1', align: R, render: (r) => fix(r.y1.total, 1) },
  { key: 'podsN', header: 'Pods, last year', align: R, title: 'At the end of the product’s own horizon', render: (r) => `${r.yN.pods} (${r.endLabel})` },
  { key: 'resN', header: 'Residual team, last year', align: R, render: (r) => fix(r.yN.residual, 1) },
  { key: 'totN', header: 'Human headcount, last year', align: R, render: (r) => fix(r.yN.total, 1) },
  { key: 'ok', header: 'V7 conservation (CC-OM-01)', render: (r) => (r.ok ? '✓ holds' : '✗ fails') },
];

/**
 * Operating model — Aggregate view: pods, residual and run teams of each product at
 * Y1 and at the end of its horizon, the V7 conservation check, and the summed teams.
 */
export default function OpModelAggregate() {
  const a = useOpModelAgg(), vs = useViewScope(), t = a.totals;
  return (
    <RollupAggregate title="🧩 Operating model — team topology & pods" Section={OpModelSection}
      note="Each product re-projects its own TO-BE team into pods, transverse roles and the AI Office; the total line adds the products’ teams. The V7 check is per product: open one below for its topology.">
      <AggregateTable caption={`Team topology by product — ${vs.label}`} rows={a.rows} columns={COLS} edit={false}
        totals={{ label: `Total — ${vs.label}`, cells: {
          pods1: t.y1.pods, res1: fix(t.y1.residual, 1), ops1: fix(t.y1.ops, 1), tot1: fix(t.y1.total, 1), podsN: t.yN.pods, resN: fix(t.yN.residual, 1), totN: fix(t.yN.total, 1),
          ok: `${t.ok} of ${a.rows.length} hold`,
        } }} />
    </RollupAggregate>
  );
}
