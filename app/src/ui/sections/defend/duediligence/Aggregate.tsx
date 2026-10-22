import { lazy } from 'react';
import type { DdProductRow } from '@/domain/portfolio';
import { useDueDiligenceRows } from '@/store/selectionHooksDefend';
import { Callout } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { R, RollupFrame } from '../../stress/AggParts';

const Detail = lazy(() => import('./index'));
const COLS: AggColumn<DdProductRow>[] = [
  { key: 'items', header: 'Items to confirm', align: R, render: (r) => r.items }, { key: 'done', header: 'Confirmed or waived', align: R, render: (r) => r.confirmed },
  { key: 'open', header: 'Still open', align: R, render: (r) => r.open }, { key: 'pct', header: 'Coverage (items)', align: R, render: (r) => `${r.pct}%` },
  { key: 'pc5', header: 'Editable nowhere (PC5)', align: R, title: 'Embedded coefficients that no screen can change', render: (r) => r.invisible },
  { key: 'ceil', header: 'Glass ceiling confirmed', align: R, render: (r) => (r.ceilCover === null ? 'n/a' : `${Math.round(r.ceilCover * 100)}%`) },
];

/** Due diligence — Aggregate view: items to confirm and their coverage per product; the roll-up adds the counts. Only the edited product’s pack is exported. */
export default function DueDiligenceAggregate() {
  const { rows, totals: t } = useDueDiligenceRows();
  return (
    <RollupFrame title="🧾 Due diligence" caption="Due diligence by product" rows={rows} columns={COLS} Section={Detail}
      totals={{ items: t.items, done: t.confirmed, open: t.open, pct: `${t.pct}%`, pc5: t.invisible, ceil: '' }}
      notes={<Callout kind="blue">The due-diligence pack (export) covers the <strong>edited product only</strong>: choose “Edit this product” to export another one. Confirmations and annotations are common to all products; the coverage is read on each product’s own values. The € weighting needs the sensitivity measurement of the edited product.</Callout>} />
  );
}
