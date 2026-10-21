import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Callout } from '@/ui/widgets/cards';
import { DisplayCoefs } from './DisplayCoefs';
import { HowItWorks } from './HowItWorks';
import { SizingPolicy } from './SizingPolicy';
import { SupervisionShare } from './SupervisionShare';

const help = (
  <>
    <p>How the agentic run team (AgentOps) is sized: a configurable hybrid of a floor headcount and a per-agent policy. Also hosts the supervision-share cap and factor that split the residual project team into delivery vs. supervision.</p>
    <p>hybrid = platform floor + agent vFTE × ops load, where floor = max(floor min, base team × floor %), only while agents exist. legacy = max(0.5, base × 10% + 0.5), ignoring automation.
      The run team is priced at the target blended day rate × 1.15 (AI-skills premium) × working days. Sanity-check agents per run FTE: above ~8 the ops load is optimistic, below ~2 the floor carries a team too small to justify it.</p>
  </>
);

/** Agentic run-team sizing — policy, live preview, supervision share and the display-only coefficients. */
export default function RunSizingSection() {
  return (
    <SectionFrame title="🤖 Agentic run-team sizing" help={help}
      input={
        <>
          <Callout>How the <strong>agentic run team</strong> (AgentOps: AI engineering, FinOps, AI-QA) is sized and costed. This team <em>operates the agent platform</em> — it is distinct from the <strong>human supervision</strong> of agent output, which lives inside the residual project team and already scales down with automation.</Callout>
          <SizingPolicy />
          <SupervisionShare />
          <DisplayCoefs />
        </>
      }
      diagnostic={<HowItWorks />} />
  );
}
