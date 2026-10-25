import { lazy } from 'react';
import { agentDetailTable } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { RollupFrame } from '../aggregate/Rollup';

const Section = lazy(() => import('../../verifyA/agent-detail'));

const NOTE = 'Agentic run FTE, supervision pole and the artifacts at each AI authorization level, '
  + 'product by product. The day rate is the product\'s own and is not added up.';

/**
 * Agent details — aggregate view (R-rollup): the agentic run team, supervision pole
 * and authorization-level artifact counts of each product, added up for the selection.
 */
export default function AgentDetailAggregate() {
  return <RollupFrame title="🤖 Agent details — the agentic operating team" caption="Agentic operating team by product" Section={Section}
    table={useVerifyView(agentDetailTable)}
    note={NOTE} />;
}
