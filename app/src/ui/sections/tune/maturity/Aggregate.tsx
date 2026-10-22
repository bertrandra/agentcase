import type { MaturityRow } from '@/domain/portfolio';
import { useMaturityAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { eurK } from '../../tuneB/fmt';
import { InputAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';

const R = 'right' as const;
const COLS: AggColumn<MaturityRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'sdd', header: 'SDD maturity', align: R, title: '0–100', render: (r) => `${r.sdd.toFixed(0)} — ${r.sddName}` },
  { key: 'cut', header: 'Tax cut', align: R, title: 'Share of the verification tax removed by SDD maturity', render: (r) => `−${r.taxCut}%` },
  { key: 'harness', header: 'Harness maturity', align: R, render: (r) => r.harness.toFixed(0) },
  { key: 'y1', header: 'Coaching Y1 (%)', align: R, render: (r) => r.coachY1.toFixed(0) },
  { key: 'cruise', header: 'Coaching cruise (%)', align: R, render: (r) => r.coachCruise.toFixed(0) },
  { key: 'cost', header: 'Coaching cost Y1', align: R, render: (r) => eurK(r.coachCostY1) },
  { key: 'level', header: 'Maturity level', align: R, render: (r) => `L${r.level}` },
];

/** Maturity & Measurement — Aggregate view: SDD / tooling maturity and the coaching curve of each product, with min / max / average (read-only). */
export default function MaturityAggregate() {
  const a = useMaturityAgg(), vs = useViewScope();
  const items: SpreadItem[] = [
    { id: 'sdd', name: 'SDD maturity', s: a.sdd, f: (v) => v.toFixed(1) },
    { id: 'harness', name: 'Harness maturity', s: a.harness, f: (v) => v.toFixed(1) },
    { id: 'coach', name: 'Coaching load Y1 (%)', s: a.coachY1, f: (v) => v.toFixed(1) },
  ];
  return (
    <InputAggregate title="📐 Maturity & Measurement" intro="SDD / tooling maturity and the coaching curve belong to each product.">
      <AggregateTable caption={`Maturity and coaching by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Total — ${vs.label}`, cells: { cost: eurK(a.totals.coachCostY1) } }} />
      <SpreadTable caption={`Spread of the maturity inputs — ${vs.label}`} items={items} />
    </InputAggregate>
  );
}
