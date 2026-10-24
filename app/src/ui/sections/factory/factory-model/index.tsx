import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { GeneratePanel } from './GeneratePanel';
import { Hierarchy } from './Hierarchy';
import { SampleData } from './SampleData';
import { StoryTable } from './StoryTable';

const help = (
  <>
    <p>Models the Business and Delivery domains of a Software/Agentic Factory meta-model as a graph, not a tree: Epics realize the Vision, Features implement Epics, Stories implement Features, and every existing
      SDLC/regulatory artefact is a Task — optionally linked up to the Story it fulfils. Deleting a Portfolio, Epic, Feature or Story orphans (unlinks) its direct children; nothing downstream is silently deleted.</p>
    <p>Purely additive metadata: the Scope, the Gantt and every cost or saving figure are computed exactly as before. The generator derives a whole weekly dataset (Vision → … → Task, releases, commits, builds,
      incidents) from the current case; it is simulated from the case&apos;s assumptions, never measured data.</p>
  </>
);

/** Factory Model (Business + Delivery domains): generator, sample data, Vision, Portfolio, Epics, Features and Stories. */
export default function FactoryModelSection() {
  return (
    <SectionFrame title="🏭 Factory Model · DRAFT" help={help}
      input={<>
        <GeneratePanel />
        <Callout>Business + Delivery domain of the Software/Agentic Factory meta-model: Vision → Portfolio → Epic → Feature → Story, linked down into
          the existing SDLC/regulatory artefacts (Tasks). A graph, not a tree — see <code>AgentCase_Spec_FactoryMetaModel.md</code>. Nothing here
          feeds the financial model.</Callout>
        <SampleData />
        <Hierarchy />
        <StoryTable />
      </>} />
  );
}
