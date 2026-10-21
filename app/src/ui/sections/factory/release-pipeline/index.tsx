import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Pipeline } from './Pipeline';
import { Releases } from './Releases';

const help = (
  <>
    <p>Models the release pipeline as a separate flow, not a continuation of the Business/Delivery tree: a Release polymorphically includes Stories, Features, Fixes and Technical Changes. A Release Candidate is cut from the current
      Integrated Product, gated by an Approval, then promoted through Deployments into Environments (Development → Integration → System Test → UAT → Pre-production → Production). Monitoring captures what happens once it is live;
      Feedback closes the loop by creating a new Backlog item.</p>
    <p>Deleting a Release deletes its own Release Items (pure join records) but only orphans the Release Candidates built from it; every other delete orphans its direct references, like the Factory Model.</p>
  </>
);

/** Release Pipeline: Release → Release Candidate → Approval → Deployment → Environment → Monitoring → Feedback → Backlog. */
export default function ReleasePipelineSection() {
  return (
    <SectionFrame title="🚀 Release Pipeline · DRAFT" help={help}
      input={<>
        <Callout>A release pipeline <em>selects</em> from the current Integrated Product rather than descending from a sprint/PI boundary — Release-on-Demand. Release → Release Candidate → Approval → Deployment → Environment → Production → Monitoring → Feedback → Backlog. Nothing here feeds the financial model.</Callout>
        <Releases />
        <Pipeline />
      </>} />
  );
}
