import type { MaturityMapRow } from '@/domain/portfolio';
import { useMaturityMapAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout } from '@/ui/widgets/cards';
import { InputAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';

const slash = (a: number[]): string => a.map((x) => Math.round(x)).join(' / ');
const COLS: AggColumn<MaturityMapRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'ramp', header: 'Adoption thresholds L1–L4 (%)', align: 'right', render: (r) => slash(r.ramp) },
  { key: 'share', header: 'Agent-share thresholds L1–L4 (%)', align: 'right', render: (r) => slash(r.share) },
  { key: 'labels', header: 'Labels', render: (r) => r.labels.join(' / ') },
  { key: 'reached', header: 'Level reached', align: 'right', title: 'Lower of the adoption and agent-share levels, capped by the engagement context', render: (r) => `L${r.reached} (adoption L${r.adoptionLevel}, share L${r.shareLevel}, cap L${r.cap})` },
];
const pct = (v: number): string => `${v.toFixed(0)}%`;

/**
 * Maturity levels (L1–L4) — Aggregate view: the thresholds each product carries, the
 * level it reaches, and the spread of every threshold over the selection (read-only).
 */
export default function MaturityMapAggregate() {
  const a = useMaturityMapAgg(), vs = useViewScope();
  const items: SpreadItem[] = [
    ...[1, 2, 3].map((i) => ({ id: `ramp${i}`, name: `Adoption threshold L${i + 1}`, s: a.ramp[i]!, f: pct })),
    ...[1, 2, 3].map((i) => ({ id: `share${i}`, name: `Agent-share threshold L${i + 1}`, s: a.share[i]!, f: pct })),
    { id: 'reached', name: 'Level reached', s: a.reached, f: (v) => `L${v.toFixed(1)}` },
  ];
  return (
    <InputAggregate title="📐 Maturity levels (L1–L4)" intro="the L1–L4 thresholds belong to each product (inherited from the common values unless overridden).">
      <AggregateTable caption={`Maturity thresholds by product — ${vs.label}`} rows={a.rows} columns={COLS} />
      <Callout kind={a.uniform ? 'green' : 'note'}>{a.uniform ? 'Every product of the selection uses the same thresholds.' : 'The thresholds differ between products of the selection (see the spread below).'}</Callout>
      <SpreadTable caption={`Spread of the thresholds — ${vs.label}`} items={items} />
    </InputAggregate>
  );
}
