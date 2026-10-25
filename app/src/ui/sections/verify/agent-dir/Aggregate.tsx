import { lazy } from 'react';
import { agentDirTable } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { RollupFrame } from '../aggregate/Rollup';

const Section = lazy(() => import('../../verifyA/agent-dir'));

const NOTE = 'Execution agents by AI authorization level, active operational roles and the agentic '
  + 'loop settings of each product. The selection line counts every agent and role once.';

/** Agent Directory — aggregate view (R-rollup): the agents by authorization level, roles and loop settings of each product; the line counts each agent once. */
export default function AgentDirAggregate() {
  return <RollupFrame title="🧑‍💻 Agent Directory" caption="Agents by authorization level and product" totalLabel="Distinct in the selection" Section={Section}
    table={useVerifyView(agentDirTable)}
    note={NOTE} />;
}
