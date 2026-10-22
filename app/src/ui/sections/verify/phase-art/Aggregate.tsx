import { lazy } from 'react';
import { phaseArtTable } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { RollupFrame } from '../aggregate/Rollup';

const Section = lazy(() => import('../../verifyA/phase-art'));

/** Phase / Artifact details — aggregate view (R-rollup): the scope and supervision margin of each product; counts and violations add up, the other figures do not. */
export default function PhaseArtAggregate() {
  return <RollupFrame title="Phase / Artifact details" caption="Phase and artifact scope by product" Section={Section} table={useVerifyView(phaseArtTable)}
    note="Phases and artifacts in scope, the tightest supervision margin (projected human share minus the floor) and the phases that would violate the floor, product by product. Scopes differ between products: nothing is summed per artifact." />;
}
