import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Badge } from '@/ui/widgets/cards';
import { AbaquePanel } from './AbaquePanel';
import { GatePanel } from './GatePanel';
import { PillarPanel } from './PillarPanel';

const help = (
  <>
    <p>The eligibility gate and the pillar × SDLC potential matrix, plus the Abaque A/B tables and the verification tax that scales effort back down.</p>
    <p><strong>Gate:</strong> six prerequisites, four of them critical (agent-accessible platform, mastered tech and standard architecture, clear and stable specifications, bounded scope &lt; 500k LoC), plus an open
      client and committed resources. A critical prerequisite unmet is a structural problem — no automation percentage fixes a codebase agents cannot reach. A large critical legacy can stay eligible per task without being eligible globally.</p>
    <p><strong>net gain</strong>(phase) = Abaque A (addressable) × Abaque B (maturity capture) − verification tax. Case 1 (overlay, default, conservative) deducts base × average human supervision on top of the supervision already retained;
      Case 2 (net) deducts only max(0, base − supervision). The hard cap (default 0.6) bounds the deducted share. The tax is informative by default — tick &quot;Deduct the verification tax from savings&quot; to feed the economics.</p>
    <p>The pillar matrix shares its source with the product-status axis (one matrix, two consumers); tick &quot;Apply pillar leverage&quot; to feed it into the Abaque reconciliation.</p>
  </>
);

/** Eligibility & Abaques: go / no-go gate, use-case pillar potential matrix, Abaque A / B reconciliation and verification tax. */
export default function EligibilitySection() {
  return (
    <SectionFrame title="🎯 Eligibility & Abaques" help={help}
      input={
        <>
          <Badge tone="blue">EV-13/15/27 · v13.7</Badge>
          <p>Wave 1 of delivery-model convergence: the <strong>eligibility gate</strong> (six prerequisites + red-flag screening), the <strong>use-case pillar × SDLC potential matrix</strong> (where to deploy agents first),
            and the <strong>Abaque A / Abaque B</strong> reconciliation with an explicit <strong>verification tax</strong> — the human review effort that turns addressable gain into net gain. All defaults are neutral, so the base case is unchanged until you engage them.</p>
          <GatePanel />
          <PillarPanel />
        </>
      }
      result={<AbaquePanel />} />
  );
}
