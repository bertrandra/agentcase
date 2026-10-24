import { lazy } from 'react';
import { velocityTable } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { RollupFrame } from '../aggregate/Rollup';

const Section = lazy(() => import('./index'));

/** Velocity & DORA — aggregate view (R-rollup): sprint velocity and lead time of each product; the uplift line is the domain's entry-team weighted velocity. */
export default function VelocityAggregate() {
  return <RollupFrame title="Velocity & DORA" caption="Velocity by product" totalLabel="Weighted by entry team" Section={Section}
    table={useVerifyView(velocityTable)}
    note="Sprint velocity from AS-IS to the horizon end and the lead time of each product. Velocities do not add up: the selection line is the velocity uplift weighted by the entry team of each product." />;
}
