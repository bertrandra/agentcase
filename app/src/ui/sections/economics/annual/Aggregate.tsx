import { useMemo } from 'react';
import { fmtRoiPct } from '@/domain/economics/roi';
import { useAnnualAggregate } from '@/store/selectionHooksEconomics';
import { fmt1, fmtK } from '@/ui/economicsFormat';
import { fmtMonths } from '@/ui/format';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Band } from '../Band';
import { Bars, ExcludedNote } from '../AggParts';

const help = (
  <>
    <p>The year-by-year view of the <strong>selection</strong> (Portfolio or one Wave) on the calendar axis: each planned product&apos;s own Time Engine
      months, shifted to its start and added up, then summed by blocks of 12 calendar months. Headcount is the year-end figure. The net by product and year
      adds up to the net of the selection.</p>
    <p>Products without a wave, or archived, are left out (the banner above says how many). Choose a product in “Show” for the single-product Annual
      summary.</p>
  </>
);
const R = 'right' as const;

/**
 * Annual summary — aggregate view (R-conso): the Portfolio / Wave by calendar year (savings, run, setup, net, cumulative cash, year-end headcount)
 * and the net by product.
 */
export default function AnnualAggregate() {
  const a = useAnnualAggregate();
  const years = useMemo(() => (a ? a.years.map((y) => ({ ...y, id: y.label, name: y.label })) : []), [a]);
  const series = useMemo(() => (a ? [{ label: 'Savings', data: a.years.map((y) => y.savings) }, { label: 'Run cost', data: a.years.map((y) => y.run) },
    { label: 'Setup', data: a.years.map((y) => y.setup) }] : []), [a]);
  const line = useMemo(() => (a ? { label: 'Net', data: a.years.map((y) => y.net) } : undefined), [a]);
  const labels = useMemo(() => years.map((y) => y.label), [years]);
  if (!a) return null;
  const h = a.headline, e = h.endYear, t = a.totals;
  const yearCols: AggColumn<(typeof years)[number]>[] = [
    { key: 'etp', header: 'Human FTE (end)', align: R, render: (y) => fmt1(y.etp) },
    { key: 'vfte', header: 'Agent vFTE (end)', align: R, render: (y) => fmt1(y.vfte) },
    { key: 'run', header: 'Run cost', align: R, render: (y) => fmtK(y.run) }, { key: 'setup', header: 'Setup', align: R, render: (y) => fmtK(y.setup) },
    { key: 'savings', header: 'Savings', align: R, render: (y) => fmtK(y.savings) },
    { key: 'net', header: 'Net', align: R, render: (y) => <b>{fmtK(y.net)}</b> },
    { key: 'cum', header: 'Cumulative cash', align: R, render: (y) => fmtK(y.cum) },
  ];
  const prodCols: AggColumn<(typeof a.rows)[number]>[] = a.years.map((y,
    i) => ({ key: `y${i}`, header: y.label, align: R, render: (r) => fmtK(r.net[i] ?? 0) }));
  return (
    <SectionFrame title={`Annual summary — ${a.label}`} help={help}
      result={<>
        <p className="ac-muted">Consolidated view of the selection: {a.label} ({h.products} planned product{h.products > 1 ? 's' : ''}). Every figure is read
          from the domain consolidation.</p>
        <Band items={[['AS-IS FTE', fmt1(h.fte.before)], [`Run Y${e.index}`, fmtK(e.run)], [`Saving Y${e.index}`, fmtK(e.savings)], ['Setup', fmtK(h.setup)],
          ['Net', fmtK(h.net)], ['ROI (net)', fmtRoiPct(h.roi)], ['Payback', fmtMonths(h.paybackMonth)]]} />
        <Bars
          labels={labels}
          series={series}
          line={line}
          stacked={false}
          label={`Annual savings, run cost, setup and net by calendar year — ${a.label}`}
          yTitle="€/year"
        />
        <AggregateTable caption={`Annual table by calendar year — ${a.label}`} first="Year" rows={years} columns={yearCols} edit={false}
          totals={{ label: `Total — ${a.label}`, cells: { run: fmtK(t.run), setup: fmtK(t.setup), savings: fmtK(t.savings), net: fmtK(t.net),
            cum: fmtK(t.cum) } }} />
        <AggregateTable caption={`Net by product and calendar year — ${a.label}`} rows={a.rows} columns={prodCols} edit={false}
          totals={{ label: `Total — ${a.label}`, cells: Object.fromEntries(a.totalNet.map((n, i) => [`y${i}`, fmtK(n)])) }} />
        <ExcludedNote excluded={a.excluded} />
      </>} />
  );
}
