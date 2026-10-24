import { setCustomerName } from '@/controllers/frame';
import { useDoc } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { TextField } from '@/ui/widgets/CommitNumber';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CoefTable } from './CoefTable';
import { ContextCard, DiscountCard } from './ContextCard';
import { LogoPanel } from './LogoPanel';

const OVERRIDES = ['values.engagementCtx', 'engageCoef'] as const;

const help = (
  <>
    <p>The contractual &amp; infrastructure frame (MSC / MSI / STA) sets how much of the delivery system Capgemini controls — and therefore the reachable
      maturity, the effective
      glass ceiling, the adoption speed, the billable share of setup and the decision-risk bar. The customer name entered here also drives the app title.
        Coefficients are
      editable and persisted in HTML snapshots.</p>
    <p>The case discount rate is the single rate every headline NPV is discounted at (set it to the sponsor’s WACC or hurdle rate). It is not the “Discount
      rate (/yr)” of the
      Flow &amp; value tab, which prices time-to-market separately.</p>
    <p>Set the context to what is actually contracted. The nine coefficients are benchmark calibrations from the delivery-model referential — edit them only
      when your measured experience differs.</p>
  </>
);

/** Engagement context — customer name, MSC / MSI / STA frame, case discount rate and the nine context coefficients. */
export default function EngagementContextSection() {
  const name = useDoc((d) => (d.customerName as string | undefined) ?? '');
  return (
    <SectionFrame title="🧭 Engagement context" help={help} overrides={OVERRIDES}
      input={
        <>
          <Panel title="🏷️ Customer name">
            <p className="ac-muted">Appears in the app title bar, e.g. <em>“AgentCase for Acme Corp”</em> — purely cosmetic, it drives nothing in the model.</p>
            <TextField label="Customer name" value={name} placeholder="e.g. Acme Corp" onChange={setCustomerName} />
          </Panel>
          <LogoPanel />
          <ContextCard />
          <DiscountCard />
          <CoefTable />
        </>
      } />
  );
}
