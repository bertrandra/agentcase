import { SectionFrame } from '@/ui/zones/SectionFrame';
import { AgentRuns } from './AgentRuns';
import { ArtifactRuns } from './ArtifactRuns';
import { ModelTable } from './ModelTable';
import { UsageEstimate } from './UsageEstimate';

const help = (
  <>
    <p>Prices the <strong>inference bill</strong> — the recurring cost of running the agents — from a volume model rather than a lump sum.</p>
    <p>agent runs / year = agent vFTE × working days × runs per day; tokens / year = runs × tokens per run;
      blended €/1M = Σ mix% × (price in × (1 − out share) + price out × out share); token cost = tokens ÷ 1e6 × blended €/1M. At 0% automation there are no agents, so no token bill.</p>
    <p>Levers: model mix (the biggest one), prices per model, output share, runs/day and tokens per run (calibrate them on a pilot). Prices are list prices: edit them to your committed-spend rates.</p>
  </>
);

/** Token economics & FinOps — usage estimate, model mix and prices, agent runs by model and by artefact. */
export default function TokenEconSection() {
  return (
    <SectionFrame title="Token economics & FinOps" help={help}
      input={<><UsageEstimate /><ModelTable /></>}
      result={<><AgentRuns /><ArtifactRuns /></>} />
  );
}
