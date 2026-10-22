import { lazy } from 'react';
import { qualityTable } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { RollupFrame } from '../aggregate/Rollup';

const Section = lazy(() => import('./index'));

/** Quality — aggregate view (R-rollup): AS-IS to horizon-end value of the main quality metrics of each product; ratios are not added up. */
export default function QualityAggregate() {
  return <RollupFrame title="Quality" caption="Quality metrics by product" totalLabel="Selection" Section={Section} table={useVerifyView(qualityTable)}
    note="AS-IS to horizon-end value of the main quality metrics of each product, and how many of its anchors are overridden. Quality ratios are not additive: open a product for its radar and all metrics." />;
}
