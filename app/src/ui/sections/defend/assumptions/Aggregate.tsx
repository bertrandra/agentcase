import { lazy } from 'react';
import type { AssumptionRow } from '@/domain/portfolio';
import { useAssumptionRows } from '@/store/selectionHooksDefend';
import { Callout } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { R, RollupFrame } from '../../stress/AggParts';

const Detail = lazy(() => import('./index'));
const COLS: AggColumn<AssumptionRow>[] = [
  { key: 'inputs', header: 'Inputs listed', align: R, render: (r) => r.inputs }, { key: 'def', header: 'At default', align: R, render: (r) => r.atDefault },
  { key: 'adj', header: 'Adjusted, not validated', align: R, title: 'Inputs moved off the benchmark default that the client has not validated', render: (r) => r.adjusted },
  { key: 'ok', header: 'Validated with the client', align: R, render: (r) => r.validated }, { key: 'state', header: 'Structured-state items', align: R, render: (r) => r.state },
  { key: 'ovr', header: 'Product-specific values', align: R, title: 'Values the product overrides instead of inheriting the common ones (0 = everything is common)', render: (r) => r.overrides },
];

/**
 * Assumptions register — Aggregate view: per product, how many assumptions sit at default, are adjusted and unvalidated, or validated; the roll-up
 * adds the counts.
 */
export default function AssumptionsAggregate() {
  const { rows, totals: t } = useAssumptionRows();
  return (
    <RollupFrame title="📒 Assumptions register" caption="Assumptions by product" rows={rows} columns={COLS} Section={Detail}
      totals={{ inputs: t.inputs, def: t.atDefault, adj: t.adjusted, ok: t.validated, state: t.state, ovr: t.overrides }}
      notes={<Callout kind="blue">Each product is compared with the benchmark defaults on its own effective values; the client validation status is common to all products. The impact column needs a Monte Carlo run of one product: open it below or choose “Edit this product”.</Callout>} />
  );
}
