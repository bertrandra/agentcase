import { useSelectionView } from '@/store/selectionHooks';
import { fmtEurK } from '@/ui/format';
import { Callout, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Cards } from '../../portfolio/consolidation/Cards';
import { CashChart } from '../../portfolio/consolidation/CashChart';
import { SummaryTable } from '../../portfolio/consolidation/SummaryTable';

const help = (
  <>
    <p>The money view of the <strong>selection</strong> (Portfolio or one Wave) instead of one product. It is the consolidation of <code>domain/portfolio</code>: each planned product&apos;s own Time Engine
      months, shifted to its start (wave start + offset) and added up. ROI, payback and NPV are those of the consolidated cash-flow, not an average of the products&apos;.</p>
    <p>Products without a wave, or archived, are left out (the banner above says how many). Choose a Product in the View selector for the full single-product Financial Summary.</p>
  </>
);

/** Financial Summary — aggregate view (R-conso exemplar): cards, cumulative cash, by-product table and calendar years of the Portfolio / Wave, all from the domain view. */
export default function FinancialAggregate() {
  const v = useSelectionView();
  if (!v) return null;
  return (
    <SectionFrame title={`Financial Summary — ${v.label}`} help={help}
      result={
        <>
          <p className="ac-muted">Consolidated view of the selection: {v.label} ({v.rows.length} planned product{v.rows.length > 1 ? 's' : ''}). Every figure is read from the domain consolidation.</p>
          <Cards h={v.headline} />
          <Panel title="Cumulative cash by calendar month"><CashChart chart={v.chart} label={`Cumulative cash by calendar month: ${v.label} and its products`} /></Panel>
          <Panel title="By product"><SummaryTable caption={`Figures by product — ${v.label}`} first="Product" rows={v.rows} totals={v.totals} totalLabel={`Total — ${v.label}`} /></Panel>
          <Panel title="By calendar year">
            <div className="ac-table-wrap" tabIndex={0}>
              <table className="ac-table ac-cons-table">
                <caption>Flows of the selection by calendar year — {v.label}</caption>
                <thead><tr><th scope="col">Year</th><th scope="col">Savings</th><th scope="col">Run cost</th><th scope="col">Setup</th><th scope="col">Net</th></tr></thead>
                <tbody>{v.years.map((y) => <tr key={y.label}><th scope="row">{y.label}</th><td>{fmtEurK(y.savings)}</td><td>{fmtEurK(y.run)}</td><td>{fmtEurK(y.setup)}</td><td>{fmtEurK(y.net)}</td></tr>)}</tbody>
              </table>
            </div>
          </Panel>
          {v.excluded.length > 0 && <Callout kind="blue">Excluded from the figures (no wave, or archived): {v.excluded.map((e) => `${e.name}${e.archived ? ' (archived)' : ''}`).join(', ')}.</Callout>}
        </>
      } />
  );
}
