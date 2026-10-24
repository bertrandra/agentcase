import { lazy } from 'react';
import { vfteOvTable } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { RollupFrame } from '../aggregate/Rollup';

const Section = lazy(() => import('../../verifyA/vfte-ov'));

/**
 * vFTE Overview — aggregate view (R-rollup): the horizon-end composition (human /
 * agent) and artifact value counts of each product, selection line from the domain.
 */
export default function VfteOvAggregate() {
  return <RollupFrame title="vFTE Overview" caption="vFTE composition by product" Section={Section} table={useVerifyView(vfteOvTable)}
    note="Human FTE, agent vFTE and total effort at the end of each product's horizon (the total effort is conserved: it equals the entry team). Open a product for its period table and artifact value categories." />;
}
