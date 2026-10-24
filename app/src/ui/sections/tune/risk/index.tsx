import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Callout } from '@/ui/widgets/cards';
import { AiActCard } from './AiActCard';
import { QualityCard } from './QualityCard';
import { RiskRegisterCard } from './RiskRegisterCard';

const help = (
  <>
    <p>Wave 2 of delivery-model convergence: the agentic risk register (EV-17), the EU AI-Act tier of the delivered product (EV-25) and the AI code-quality
      risk premium (EV-23).
      Each is informative by default; its toggle makes it raise the Decision Intelligence bar (and, for the quality premium, the verification tax).</p>
    <p>quality premium = (anchor multiplier − 1) × (1 − SDD mitigation), capped at qualPremiumCap; verification-tax factor = 1 + premium; DI-bar contribution =
      premium × qualBarFactor, capped at 0.15 pts.
      Register: probability × impact on a 1–3 scale, consolidated as the mean score / 9, contributing at most 0.15 pts to the bar.</p>
  </>
);

/** Risk & Compliance — AI-Act tier, AI code-quality premium and the agentic risk register. */
export default function RiskSection() {
  return (
    <SectionFrame title="🛡️ Risk & Compliance" help={help}
      input={
        <>
          <Callout>Wave 2 of delivery-model convergence: the <strong>agentic risk register</strong> (Part 5.2), the <strong>EU AI-Act tier
            classifier</strong> for the delivered product, and the <strong>AI code-quality risk premium</strong> (Part 5.1). Each can be surfaced
            informatively or, via a toggle, raise the Decision Intelligence bar and the verification tax. Defaults are neutral, so the base case is
            unchanged.</Callout>
          <AiActCard />
          <QualityCard />
          <RiskRegisterCard />
        </>
      } />
  );
}
