import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Badge, Callout } from '@/ui/widgets/cards';
import { CheckInput } from '@/ui/widgets/fields';
import { AsisPanel } from './AsisPanel';
import { CcScale } from './CcScale';
import { HubResult } from './HubResult';

const help = (
  <>
    <p>Quantifies the referential's living memory (Knowledge Graph, KT Hub) through three channels: (1) a potential multiplier from the connected-context maturity CC0–CC4, capped by the regulatory ceiling headroom;
      (2) a variance reducer on the Monte Carlo adoption spread, σ × (1 − 0.08 × CC); (3) avoided knowledge-transfer and onboarding cost, added to savings.</p>
    <p>The hub is not free: a setup cost (added to the Setup budget), a curation FTE and an infrastructure line, charged only in years where agents run. The reachable CC level is capped by the engagement context (MSC up to CC4, MSI up to CC2, STA locked).
      Untick the hub and all three channels go neutral.</p>
  </>
);

/** Knowledge hub — enable, AS-IS assessment, target maturity and cost inputs; the three-channel read-out. */
export default function KnowledgeSection() {
  return (
    <SectionFrame title="🧠 Knowledge hub — living memory" help={help}
      input={
        <>
          <Badge tone="blue">EV-10 · v13.1</Badge>
          <Callout>The referential's <em>mémoire vivante</em> (Knowledge Graph, KT Hub) quantified through three channels: <strong>(1)</strong> a potential multiplier via the connected-context maturity CC0–CC4 (capped by the regulatory ceiling), <strong>(2)</strong> a variance reducer on the Monte Carlo adoption spread (−8% σ per CC level), <strong>(3)</strong> avoided knowledge-transfer &amp; onboarding cost. Availability is bounded by the engagement context (STA: locked · MSI: up to CC2 · MSC: up to CC4).</Callout>
          <CheckInput id="khEnabled" label="Enable the Knowledge hub in the model" />
          <AsisPanel />
        </>
      }
      result={<HubResult />}
      diagnostic={<CcScale />} />
  );
}
