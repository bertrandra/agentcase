import { lazy } from 'react';
import { execTable } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { RollupFrame } from '../aggregate/Rollup';

const Section = lazy(() => import('./index'));

/** Execution Timeline — aggregate view (R-rollup): start, ramp end and first agent vFTE of each product on the portfolio calendar and its sprint velocity; the line is the programme span. */
export default function ExecAggregate() {
  return <RollupFrame title="Execution Timeline" caption="Milestones and sprint velocity by product" totalLabel="Programme span" Section={Section} table={useVerifyView(execTable)}
    note="Where each product sits on the portfolio calendar (wave start plus offset) and its sprint velocity from AS-IS to the horizon end. Velocity does not add up; the selection line gives the earliest start and the latest ramp end." />;
}
