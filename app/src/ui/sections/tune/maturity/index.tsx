import { Badge } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CoachPanel, SddPanel } from './SddCoach';
import { GovPanel, SoclePanel } from './SocleGov';

const help = (
  <>
    <p>Wave 3 of delivery-model convergence: SDD &amp; tooling maturity (cuts the verification tax: up to −50% at 100), the coaching curve &amp; autonomy
      weaning, the four-family measurement socle —
      DORA + SPACE + AI-signals + human indicators — and the governance gates, enlarged DoD and AI-BOM.</p>
    <p>SDD maturity feeds the economics (verification tax and AI code-quality premium); the rest is analytical.</p>
  </>
);

/** Maturity & measurement (EV-16/19/20/24/29): SDD maturity, coaching curve, measurement socle and governance gates. */
export default function MaturitySection() {
  return (
    <SectionFrame title="📐 Maturity & Measurement" help={help}
      input={
        <>
          <Badge tone="blue">EV-16/19/20/24/29 · v13.9</Badge>
          <p>Wave 3 of delivery-model convergence: SDD &amp; tooling maturity (Part 2.1, cuts the verification tax), the coaching curve &amp; autonomy weaning
            (Parts 3.2/4.2), the four-family measurement socle — DORA + SPACE + AI-signals + human indicators
            (Parts 3.3/6.3) — and the governance gates, enlarged DoD and AI-BOM (Part 5.1). SDD maturity feeds the economics; the rest is analytical.</p>
          <SddPanel />
          <CoachPanel />
        </>
      }
      result={<><SoclePanel /><GovPanel /></>} />
  );
}
