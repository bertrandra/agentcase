import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Badge, Callout } from '@/ui/widgets/cards';
import { CheckInput } from '@/ui/widgets/fields';
import { AsisPanel } from './AsisPanel';
import { CcScale } from './CcScale';
import { HubResult } from './HubResult';
import { MultiPanels, SubsetBanner } from './MultiPanels';
import { SubsetFieldBox } from './SubsetBadge';

const help = (
  <>
    <p>Quantifies the referential's living memory (Knowledge Graph, KT Hub) through three channels: (1) a potential multiplier from the connected-context maturity CC0–CC4, capped by the regulatory ceiling headroom;
      (2) a variance reducer on the Monte Carlo adoption spread, σ × (1 − 0.08 × CC); (3) avoided knowledge-transfer and onboarding cost, added to savings.</p>
    <p>The hub is not free: a setup cost (added to the Setup budget), a curation FTE and an infrastructure line, charged only in years where agents run. The reachable CC level is capped by the engagement context (MSC up to CC4, MSI up to CC2, STA locked).
      Untick the hub and all three channels go neutral.</p>
    <p>With several products the hub is shared by the portfolio, and each product has its own subset: activation, the nine maturity answers, target CC, curation, setup base, knowledge domains and the preparation of its
      knowledge transfer. Each field shows whether the product inherits the common hub or has its own value. The shared hub settings (activation by default, infrastructure and how it is charged) are in the card below.</p>
  </>
);

/**
 * Knowledge hub — enable, AS-IS assessment, target maturity and cost inputs; the three-channel
 * read-out. With 2+ products it edits the ACTIVE product's subset of the shared hub.
 */
export default function KnowledgeSection() {
  return (
    <SectionFrame title="🧠 Knowledge hub — living memory" help={help}
      input={
        <>
          <Badge tone="blue">EV-10 · v13.1</Badge>
          <Callout>The referential's <em>mémoire vivante</em> (Knowledge Graph, KT Hub) quantified through three channels: <strong>(1)</strong> a
            potential multiplier via the connected-context maturity CC0–CC4 (capped by the regulatory ceiling), <strong>(2)</strong> a variance
            reducer on the Monte Carlo adoption spread (−8% σ per CC level), <strong>(3)</strong> avoided knowledge-transfer &amp; onboarding cost.
            Availability is bounded by the engagement context (STA: locked · MSI: up to CC2 · MSC: up to CC4).</Callout>
          <SubsetBanner />
          <SubsetFieldBox field="enabled" label="Hub use"><CheckInput id="khEnabled" label="Enable the Knowledge hub in the model" /></SubsetFieldBox>
          <AsisPanel />
          <MultiPanels />
        </>
      }
      result={<HubResult />}
      diagnostic={<CcScale />} />
  );
}
