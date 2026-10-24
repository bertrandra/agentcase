import { lazy } from 'react';
import { productivityTable } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { RollupFrame } from '../aggregate/Rollup';

const Section = lazy(() => import('./index'));

/** Productivity & Throughput — aggregate view (R-rollup): artifacts per engineer per month of each product; the line is the mean weighted by the entry team. */
export default function ProductivityAggregate() {
  return <RollupFrame title="Productivity & Throughput" caption="Throughput per engineer by product" totalLabel="Weighted by entry team" Section={Section}
    table={useVerifyView(productivityTable)}
    note="Artifacts per engineer per month, AS-IS and at the horizon end, summed over the categories in scope of each product. The selection line weights the products by their entry team." />;
}
