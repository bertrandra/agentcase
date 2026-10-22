import { useConsolidation } from '@/store/consolidationHooks';
import { fmtEurK } from '@/ui/format';
import { Callout, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Cards } from './Cards';
import { CashChart } from './CashChart';
import { SummaryTable } from './SummaryTable';

const help = (
  <>
    <p>The portfolio trajectory is <strong>exactly the sum of the products&apos; own trajectories</strong>, each shifted to its start (wave start + offset) and cut at the portfolio horizon; nothing is recomputed here.
      Products without a wave (or archived) are left out. Payback is the first calendar month the consolidated cumulative cash is positive; the NPV discounts each calendar month from month 1.</p>
    <p>The by-wave and by-product lines add up to the total line, which is the portfolio headline. Change the start of a wave or move a product in the 🌊 Waves section: every figure follows.</p>
  </>
);

const LABEL: Record<string, string> = {
  unscheduled: 'Unscheduled product', truncated: 'Cut at the horizon', 'kt-lead-clamped': 'Preparation capped at month 1', 'target-capped': 'Target capped', 'hub-unused': 'Hub unused',
};

/** Consolidation — the portfolio trajectory (F15, F16): cards, cumulative cash by month, by wave, by product, by year, diagnostics. */
export default function ConsolidationSection() {
  const v = useConsolidation();
  return (
    <SectionFrame title="📈 Consolidation" help={help}
      result={
        <>
          <Cards h={v.headline} />
          <Panel title="Cumulative cash by calendar month"><CashChart chart={v.chart} /></Panel>
          <Panel title="By wave"><SummaryTable caption="Consolidation by wave" first="Wave" rows={v.waves} totals={v.totals} withCount /></Panel>
          <Panel title="By product"><SummaryTable caption="Consolidation by product" first="Product" rows={v.products} totals={v.totals} /></Panel>
          <Panel title="By calendar year">
            <div className="ac-table-wrap" tabIndex={0}>
              <table className="ac-table ac-cons-table">
                <caption>Portfolio flows by calendar year</caption>
                <thead><tr><th scope="col">Year</th><th scope="col">Savings</th><th scope="col">Run cost</th><th scope="col">Setup</th><th scope="col">Net</th></tr></thead>
                <tbody>{v.years.map((y) => <tr key={y.label}><th scope="row">{y.label}</th><td>{fmtEurK(y.savings)}</td><td>{fmtEurK(y.run)}</td><td>{fmtEurK(y.setup)}</td><td>{fmtEurK(y.net)}</td></tr>)}</tbody>
              </table>
            </div>
          </Panel>
          <Callout>A product’s NPV is calendar-based here (discounted from month 1 of the portfolio); its NPV from its own start is in the Products section.</Callout>
        </>
      }
      diagnostic={
        <Panel title="Diagnostics">
          {v.diagnostics.length === 0 ? <p className="ac-muted">No diagnostic: every product is scheduled and fits within the horizon.</p> : (
            <ul aria-label="Consolidation diagnostics">
              {v.diagnostics.map((d, i) => <li key={`${d.code}-${d.productId ?? ''}-${i}`} data-code={d.code}><strong>{LABEL[d.code] ?? d.code}</strong> — {d.message}</li>)}
            </ul>
          )}
          {v.excluded.length > 0 && <p className="ac-muted">Excluded from the consolidation: {v.excluded.map((e) => `${e.name}${e.archived ? ' (archived)' : ''}`).join(', ')}.</p>}
        </Panel>
      } />
  );
}
