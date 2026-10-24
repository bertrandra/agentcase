import { CM_DEFS } from '@/domain/pdc/commercial';
import { useViewScope } from '@/store/viewScope';
import { useCommercialAggregate } from '@/store/selectionHooksPresent';
import { fmtK } from '@/ui/economicsFormat';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout } from '@/ui/widgets/cards';
import { ProductDrill } from '@/ui/widgets/ProductDrill';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ExcludedNote } from '../../economics/AggParts';
import CommercialSection from './index';

const help = (
  <p>How the value created is sold, product by product: the commercial model each planned product of the <strong>selection</strong> has selected, its revenue, margin and client saving over its own horizon, and the model the
    engagement context recommends. The gain share is not linear, so nothing is derived from a summed input: the total line adds up the contracts of the products.</p>
);
const R = 'right' as const;
/** The sign of a margin or a saving (`data-sign` of `.ac-margin`: teal when positive, brick when negative). */
const tone = (x: number): 'pos' | 'neg' => (x >= 0 ? 'pos' : 'neg');

/**
 * Commercial model — aggregate view (R-rollup): the selected model, revenue, margin and client saving of each product, the roll-up of the contracts,
 * and the full section per product.
 */
export default function CommercialAggregate() {
  const a = useCommercialAggregate(), vs = useViewScope();
  if (!a) return null;
  const off = <span className="ac-muted">unavailable</span>;
  const cols: AggColumn<(typeof a.rows)[number]>[] = [
    { key: 'wave', header: 'Wave', render: (r) => r.wave },
    { key: 'model', header: 'Selected model', render: (r) => CM_DEFS[r.selected].label }, { key: 'rec', header: 'Recommended', render: (r) => CM_DEFS[r.recommended].label },
    { key: 'rev', header: 'Client revenue', align: R, render: (r) => (r.row.available ? fmtK(r.row.revenue) : off) },
    { key: 'cost', header: 'Supplier cost', align: R, render: (r) => (r.row.available ? fmtK(r.row.cost) : off) },
    { key: 'margin', header: 'Supplier margin', align: R, render: (r) => (r.row.available ? <span className="ac-margin" data-sign={tone(r.row.margin)}>{fmtK(r.row.margin)} ({Math.round(r.row.marginPct)}%)</span> : off) },
    { key: 'save', header: 'Client saving vs AS-IS', align: R, render: (r) => (r.row.available ? <span className="ac-margin" data-sign={tone(r.row.clientSaving)}>{Math.round(r.row.clientSaving)}%</span> : off) },
  ];
  const t = a.totals;
  return (
    <SectionFrame title={`Commercial model — ${a.label}`} help={help}
      result={<>
        <AggregateTable caption={`Commercial model by product — ${a.label}`} rows={a.rows} columns={cols} edit={false}
          totals={{ label: `Total — ${a.label}`, cells: { rev: fmtK(t.revenue), cost: fmtK(t.cost), margin: `${fmtK(t.margin)} (${Math.round(t.marginPct)}%)` } }} />
        <Callout kind="blue">Each line is a product&apos;s own contract over its own horizon; the total adds the contracts up{t.unavailable ? ` (${t.unavailable} product${t.unavailable > 1 ? 's' : ''} on a model unavailable under its engagement context left out)` : ''}.
          Open a product below to compare the four models for it.</Callout>
        <ProductDrill Section={CommercialSection} productIds={vs.productIds} />
        <ExcludedNote excluded={a.excluded} />
      </>} />
  );
}
