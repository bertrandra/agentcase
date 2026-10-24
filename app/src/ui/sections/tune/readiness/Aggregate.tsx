import type { ReadinessRow } from '@/domain/portfolio';
import { useReadinessAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { RollupAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';
import ReadinessSection from './index';

const R = 'right' as const;
const COLS: AggColumn<ReadinessRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'index', header: 'AI Readiness Index', align: R, title: '0–100, average of the dimension scores', render: (r) => (r.index == null ? '—' : Math.round(r.index)) },
  { key: 'band', header: 'Level', render: (r) => r.band },
  { key: 'answered', header: 'Statements answered (of 30)', align: R, render: (r) => r.answered },
  { key: 'weak', header: 'Weakest dimension', render: (r) => r.weakest ?? '—' },
  { key: 'hri', header: 'Human Readiness', align: R, render: (r) => (r.hriOn ? `${r.hri} (${r.hriLabel})` : 'off') },
];

/**
 * AI Readiness Index — Aggregate view: index, level, weakest dimension and Human Readiness of
 * each product, and the mean over the assessed products; the questionnaire per product below.
 */
export default function ReadinessAggregate() {
  const a = useReadinessAgg(), vs = useViewScope();
  const items: SpreadItem[] = [
    { id: 'index', name: 'AI Readiness Index (assessed products)', s: a.index, f: (v) => v.toFixed(1) },
    { id: 'hri', name: 'Human Readiness Index (products with HRI on)', s: a.hri, f: (v) => v.toFixed(1) },
  ];
  return (
    <RollupAggregate title="AI Readiness Index" Section={ReadinessSection}
      note="The index is a score per product and does not add up: the roll-up is the mean over the assessed products. Open a product below to see its assessment as it computes it.">
      <AggregateTable caption={`AI readiness by product — ${vs.label}`} rows={a.rows} columns={COLS} edit={false}
        totals={{ label: `Mean of assessed — ${vs.label}`, cells: { index: a.assessed ? Math.round(a.index.avg) : '—', band: a.band, answered: `${a.assessed} of ${a.rows.length} assessed` } }} />
      <SpreadTable caption={`Spread of the readiness — ${vs.label}`} items={items} />
    </RollupAggregate>
  );
}
