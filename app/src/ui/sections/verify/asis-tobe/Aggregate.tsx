import { asisTobeAgg } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { BeforeAfterTable } from '../aggregate/BeforeAfter';
import { ExcludedNote, VerifyTable } from '../aggregate/Rollup';

/**
 * AS-IS vs TO-BE — aggregate view (R-conso): the selection before and after (headcount, reference
 * cost vs TO-BE cost, setup, weighted automation and ceiling) and the same per product.
 */
export default function AsisTobeAggregate() {
  const a = useVerifyView(asisTobeAgg);
  if (!a) return null;
  const intro = `Comparison of the same workload run manually (AS-IS) vs agentic (TO-BE) for ${a.label}: `
    + 'figures of the planned products added up; ratios weighted by their entry team.';
  return (
    <SectionFrame title="AS-IS vs TO-BE" help={<p>{intro}</p>} result={
      <>
        <p className="ac-muted">{intro}</p>
        <Panel title="Consolidated before / after"><BeforeAfterTable rows={a.rows} caption={`AS-IS vs TO-BE — ${a.label}`} tobe="TO-BE (horizon end)" /></Panel>
        <Panel title="By product"><VerifyTable table={a.table} caption="AS-IS vs TO-BE by product" totalLabel="Consolidated" /></Panel>
        <ExcludedNote />
      </>
    } />
  );
}
