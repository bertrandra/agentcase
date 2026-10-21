import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Builds } from './Builds';
import { IntegratedProduct } from './IntegratedProduct';

const help = (
  <>
    <p>Models the Engineering domain: a Commit implements a Task (one of the 53 SDLC or 370 regulatory artefacts), a Build produces Build Artifacts, each Build Artifact can clear Quality Gates, and the Integrated Product is composed
      of whichever Build Artifacts you include — the baseline the Release Pipeline cuts Release Candidates from.</p>
    <p>Deliberately illustrative: AgentCase is a business-case tool, not a connected CI/CD platform, so commits, builds and gate results are recorded by hand (or generated in the Factory Model). Nothing here changes the Scope or any cost or saving figure.</p>
  </>
);

/** Engineering: Commit → Build → Build Artifact → Quality Gate → Integrated Product (illustrative, user-entered counters). */
export default function EngineeringSection() {
  return (
    <SectionFrame title="⚙️ Engineering · DRAFT" help={help}
      input={<>
        <Callout>Commit → Build → Build Artifact → Quality Gate → Integrated Product. <strong>Illustrative, user-entered counters</strong> — AgentCase has no live CI/CD integration to pull real commits/builds/gates from. Nothing here feeds the financial model.</Callout>
        <Builds />
        <IntegratedProduct />
      </>} />
  );
}
