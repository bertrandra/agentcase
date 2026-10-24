import { Badge } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CacheCard, IpCard, SafeCard, TransCard } from './Governance';
import { CapCard, PilotCard } from './PilotCap';

const help = (
  <>
    <p>Completeness and planning surfaces from the delivery-model referential: pilot sizing, the internal capability build (Volet A), multi-pod / AI-Native
      SAFe overhead, the IP · confidentiality ·
      sovereignty synthesis per engagement context, the maturity transition criteria and the token cache / total-cost logic.</p>
    <p>Analytical by default — the base case is unchanged until you engage a block. These are not silent modifiers of the euro result.</p>
  </>
);

/** Programme & completeness (EV-14/18/21/22/26/28): analytical planning blocks. */
export default function ProgramSection() {
  return (
    <SectionFrame title="🧭 Program & Completeness" help={help}
      input={
        <>
          <Badge tone="blue">EV-14/18/21/22/26/28 · v14.0</Badge>
          <p>Wave 4 completes the convergence with the reference model: <strong>pilot sizing</strong>, the <strong>internal capability build (Volet
            A)</strong>, <strong>multi-pod / AI-Native SAFe overhead</strong>,
            the <strong>IP · confidentiality · sovereignty</strong> synthesis per context, the <strong>maturity transition criteria</strong>, and
              the <strong>token cache / total-cost</strong> logic. Analytical by default — the base case is unchanged.</p>
          <PilotCard />
          <CapCard />
          <CacheCard />
        </>
      }
      result={<><SafeCard /><IpCard /><TransCard /></>} />
  );
}
