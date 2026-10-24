import { useMemo } from 'react';
import { useMonthlyAggregate } from '@/store/selectionHooksEconomics';
import { fmt1, fmtE, fmtK } from '@/ui/economicsFormat';
import { fmtMonths } from '@/ui/format';
import { DataTable } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CashChart } from '../../portfolio/consolidation/CashChart';
import { Band } from '../Band';
import { Bars, ExcludedNote } from '../AggParts';

const help = (
  <>
    <p>The month-by-month trajectory of the <strong>selection</strong> (Portfolio or one Wave) on the calendar axis: each planned product&apos;s own Time Engine month, shifted to its start (wave start + offset) and added up.
      The cumulative cash is that of the consolidated flows, so payback and NPV read straight off this table.</p>
    <p>Products without a wave, or archived, are left out (the banner above says how many). Choose a product in “Show” for the single-product Monthly detail.</p>
  </>
);
/** The sign of a cash figure (`data-sign` of `.ac-cash`: teal when positive, amber when negative). */
const sign = (x: number): 'pos' | 'neg' => (x >= 0 ? 'pos' : 'neg');
const R = 'right' as const;

/** Monthly detail — aggregate view (R-conso): one line per calendar month of the Portfolio / Wave and the cumulative cash by product. */
export default function MonthlyAggregate() {
  const a = useMonthlyAggregate();
  const labels = useMemo(() => (a ? a.months.map((m) => m.label) : []), [a]);
  const series = useMemo(() => (a ? [{ label: 'Savings', data: a.months.map((m) => m.savings) }, { label: 'Run cost', data: a.months.map((m) => -m.run) }] : []), [a]);
  const line = useMemo(() => (a ? { label: 'Cumulative cash', data: a.months.map((m) => m.cum) } : undefined), [a]);
  if (!a) return null;
  const h = a.headline;
  return (
    <SectionFrame title={`Monthly detail — ${a.label}`} help={help}
      result={<>
        <p className="ac-muted">Consolidated view of the selection: {a.label} ({h.products} planned product{h.products > 1 ? 's' : ''}), {a.months.length} calendar months. Every figure is read from the domain consolidation.</p>
        <Band items={[['Net', fmtK(h.net)], ['Setup', fmtK(h.setup)], ['Payback', fmtMonths(h.paybackMonth)], ['Calendar NPV', fmtK(h.npv)]]} />
        <Bars labels={labels} series={series} line={line} stacked={false} label={`Monthly savings, run cost and cumulative cash — ${a.label}`} yTitle="€/month" />
        <Panel title="Cumulative cash by product"><CashChart chart={a.chart} label={`Cumulative cash by calendar month: ${a.label} and its products`} /></Panel>
        <DataTable caption={`Monthly table — ${a.label}`} rows={a.months} rowKey={(m) => String(m.month)} columns={[
          { key: 'm', header: 'Month', render: (m) => `M${m.month} · ${m.label}` },
          { key: 'h', header: 'Human FTE', align: R, render: (m) => fmt1(m.etp) },
          { key: 'a', header: 'Agent vFTE', align: R, render: (m) => fmt1(m.vfte) },
          { key: 'r', header: 'Run cost', align: R, render: (m) => fmtE(m.run) },
          { key: 's', header: 'Setup', align: R, render: (m) => (m.setup !== 0 ? fmtE(m.setup) : '—') },
          { key: 'sv', header: 'Saving', align: R, render: (m) => fmtE(m.savings) },
          { key: 'n', header: 'Net', align: R, render: (m) => <span className="ac-cash" data-sign={sign(m.net)}>{fmtE(m.net)}</span> },
          { key: 'c', header: 'Cumulative', align: R, render: (m) => <b className="ac-cash" data-sign={sign(m.cum)}>{fmtE(m.cum)}</b> },
        ]} />
        <ExcludedNote excluded={a.excluded} />
      </>} />
  );
}
