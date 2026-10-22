import { Panel, Callout } from '@/ui/widgets/cards';
import { HubSettings } from '@/ui/widgets/HubSettings';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { KtDiagnostics } from './KtDiagnostics';
import { KtTable } from './KtTable';
import { WaveEffect } from './WaveEffect';

const help = (
  <>
    <p>The Knowledge Hub is shared by the portfolio; <strong>each product uses a subset of it</strong>: its own maturity answers (starting CC), target CC (capped by the engagement context), curation, setup base,
      knowledge domains and the months of preparation before its wave. A product that sets nothing inherits the common hub, so its figures are today&apos;s.</p>
    <p>The table has one row per product: the one-off KT setup cost, the yearly cost (curation plus the product&apos;s share of the infrastructure), the KT days avoided per year and the effect of the hub (savings with the hub
      minus savings with it off, for that product). Click a row to make the product active, then edit its subset in the Knowledge hub section. The infrastructure is charged per product (full cost each) or shared by entry headcount.</p>
  </>
);

/** Knowledge transfer — the hub settings shared by the portfolio, one row per product (F29), the hub effect by wave (F31) and the diagnostics. */
export default function KnowledgeTransferSection() {
  return (
    <SectionFrame title="🔁 Knowledge transfer" help={help}
      input={<HubSettings />}
      result={
        <>
          <Panel title="Sous-ensemble du hub par produit"><KtTable /></Panel>
          <Panel title="Effet du hub par vague"><WaveEffect /></Panel>
          <Callout>Le sous-ensemble d’un produit se modifie dans la section « Knowledge hub » (produit actif) ; la préparation du transfert (mois avant la vague) ne déplace que le coût de mise en place du transfert dans la consolidation.</Callout>
        </>
      }
      diagnostic={<KtDiagnostics />} />
  );
}
