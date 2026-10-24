import { useMemo } from 'react';
import { fteVfteAgg } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { fmt1 } from '@/ui/economicsFormat';
import { Callout, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SimpleTable } from '../../verifyA/SimpleTable';
import { ExcludedNote, VerifyTable } from '../aggregate/Rollup';
import { LineChart } from '../aggregate/LineChart';

const help = (
  <>
    <p>Human FTE going down and agent vFTE coming up, for the <strong>selection</strong> (Portfolio or one Wave) on the portfolio calendar: each planned
      product&apos;s own Time Engine months, shifted to its start and added up.</p>
    <p>A product counts from its start month; before it, and after its own horizon, it contributes nothing. Choose a product in “Show” for the single-product
      chart with the maturity levels.</p>
  </>
);

/**
 * FTE / vFTE Chart — aggregate view (R-conso): the consolidated human / agent
 * trajectory by calendar month and year, and the end-of-horizon split of each product.
 */
export default function FteVfteAggregate() {
  const a = useVerifyView(fteVfteAgg);
  const lines = useMemo(() => (a ? [{ label: `${a.label} — Human FTE`, data: a.chart.human, thick: true }, { label: `${a.label} — Agent vFTE`, data: a.chart.agent, thick: true },
    ...a.chart.products.map((p) => ({ label: `${p.label} — Agent vFTE`, data: p.agent }))] : []), [a]);
  if (!a) return null;
  return (
    <SectionFrame title="FTE / vFTE Chart" help={help} result={
      <>
        <p className="ac-muted">Effort evolution of {a.label}: human FTE decreases and agent vFTE grows as each product starts and ramps up. Every figure is
          read from the domain consolidation.</p>
        <LineChart labels={a.chart.labels} lines={lines} yTitle="FTE / vFTE" label={`Human FTE and agent vFTE by calendar month: ${a.label} and its products`} />
        <Panel title="By calendar year (year end)">
          <SimpleTable caption={`Headcount at calendar year end — ${a.label}`} align={['left', 'right', 'right', 'right']} head={['Year', 'Human FTE', 'Agent vFTE', 'Total effort (FTE-eq)']}
            rows={a.years.map((y) => ({ key: y.label, cells: [y.label, fmt1(y.human), fmt1(y.agent), fmt1(y.total)] }))} />
        </Panel>
        <Panel title="By product (end of each product's horizon)"><VerifyTable table={a.table} caption="FTE and vFTE by product" /></Panel>
        <Callout kind="blue">The total effort is conserved per product (it equals its entry team); the calendar years above only count the products that have
          started.</Callout>
        <ExcludedNote />
      </>
    } />
  );
}
