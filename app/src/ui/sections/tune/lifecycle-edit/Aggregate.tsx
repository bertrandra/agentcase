import type { TuneLifecycleRow } from '@/domain/portfolio';
import { useLifecycleAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { InputAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';

/**
 * Product profile & phase coefficients — Aggregate view: lifecycle axis, position,
 * profile, automation posture per status and edited cells, per product (read-only).
 */
export default function LifecycleEditAggregate() {
  const a = useLifecycleAgg(), vs = useViewScope();
  const cols: AggColumn<TuneLifecycleRow>[] = [
    { key: 'wave', header: 'Wave', render: (r) => r.wave },
    { key: 'used', header: 'Lifecycle axis', render: (r) => (r.used ? 'on' : 'off') },
    { key: 'pos', header: 'Position', align: 'right', title: 'Product-status slider, 0–100', render: (r) => r.pos.toFixed(0) },
    { key: 'profile', header: 'Nearest profile', render: (r) => r.profile },
    ...a.statuses.map((s, i) => ({ key: `p${s.id}`, header: `Posture: ${s.label}`, align: 'right' as const, render: (r: TuneLifecycleRow) => (r.postures[i] ?? 1).toFixed(2) })),
    { key: 'edited', header: 'Edited cells', align: 'right', title: 'Matrix cells (weights and postures) that differ from the shipped benchmark', render: (r) => r.edited },
  ];
  const items: SpreadItem[] = [
    { id: 'pos', name: 'Lifecycle position', s: a.pos, f: (v) => v.toFixed(0) },
    ...a.statuses.map((s, i) => ({ id: `p${s.id}`, name: `Automation posture: ${s.label}`, s: a.postures[i]!, f: (v: number) => v.toFixed(2) })),
  ];
  return (
    <InputAggregate title="📊 Product profile & phase coefficients"
      intro="the status × phase weights and automation postures belong to each product (benchmarks, overridable per product).">
      <AggregateTable caption={`Profile and postures by product — ${vs.label}`} rows={a.rows} columns={cols} />
      <p className="ac-muted">{a.editedProducts} of {a.rows.length} product(s) carry coefficients edited against the benchmark.</p>
      <SpreadTable caption={`Spread of the lifecycle inputs — ${vs.label}`} items={items} />
    </InputAggregate>
  );
}
