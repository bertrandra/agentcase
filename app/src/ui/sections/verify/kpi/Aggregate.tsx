import { kpiAgg } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Cards } from '../../portfolio/consolidation/Cards';
import { BeforeAfterTable } from '../aggregate/BeforeAfter';
import { ExcludedNote, VerifyTable } from '../aggregate/Rollup';

const help = (
  <>
    <p>The KPI scorecard of the <strong>selection</strong> (Portfolio or one Wave): the financial KPIs of the consolidated cash-flow, the capacity KPIs before and after, and the ratios that do not add up (automation, ceiling, velocity) weighted by the entry team of each product.</p>
    <p>Quality KPIs (test coverage, lead time) stay product by product. Choose a Product in the View selector for the single-product scorecard.</p>
  </>
);

/** KPI Scorecard — aggregate view (R-conso): consolidated financial and capacity KPIs of the selection, and the non-additive KPIs per product. */
export default function KpiAggregate() {
  const a = useVerifyView(kpiAgg);
  if (!a) return null;
  return (
    <SectionFrame title="KPI Scorecard — AS-IS vs end of transformation" help={help} result={
      <>
        <p className="ac-muted">Consolidated dashboard of {a.label}: initial state (entry teams) vs the end of each product&apos;s horizon.</p>
        <Cards h={a.headline} />
        <Panel title="💰 Economic & Capacity KPIs"><BeforeAfterTable rows={a.consolidated} caption={`Economic and capacity KPIs — ${a.label}`} asis="AS-IS" tobe="Horizon end" /></Panel>
        <Panel title="By product"><VerifyTable table={a.table} caption="KPIs by product" totalLabel="Consolidated" /></Panel>
        <ExcludedNote />
      </>
    } />
  );
}
