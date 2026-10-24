import { useMemo } from 'react';
import type { RunParts } from '@/domain/portfolio';
import { useRunAggregate } from '@/store/selectionHooksEconomics';
import { fmt1, fmtK } from '@/ui/economicsFormat';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Badge } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Band } from '../Band';
import { Bars, ExcludedNote } from '../AggParts';

const help = (
  <>
    <p>The recurring cost after transformation of the <strong>selection</strong> (Portfolio or one Wave): the planned products&apos; own run costs (residual team, agentic run team, tokens, infrastructure, Knowledge Hub),
      each shifted to its start and added up month by month, then summed by calendar year.</p>
    <p>Products without a wave, or archived, are left out (the banner above says how many). Choose a product in “Show” for the single-product Agentic Run.</p>
  </>
);
const R = 'right' as const;
const cols = <T extends RunParts & { etp: number }>(): AggColumn<T>[] => [
  { key: 'etp', header: 'Team FTE (end)', align: R, title: 'Human FTE in the last month', render: (r) => fmt1(r.etp) },
  { key: 'team', header: 'Team & agentic run', align: R, title: 'Residual team and agentic run team', render: (r) => fmtK(r.team) },
  { key: 'token', header: 'Tokens', align: R, render: (r) => fmtK(r.token) },
  { key: 'infra', header: 'Infra', align: R, render: (r) => fmtK(r.infra) },
  { key: 'kh', header: 'Knowledge Hub', align: R, render: (r) => fmtK(r.kh) },
  { key: 'run', header: 'Total Run', align: R, render: (r) => <strong>{fmtK(r.run)}</strong> },
];
const cells = (t: RunParts & { etp: number }) => ({ etp: fmt1(t.etp), team: fmtK(t.team), token: fmtK(t.token), infra: fmtK(t.infra), kh: fmtK(t.kh), run: fmtK(t.run) });

/** Agentic Run — aggregate view (R-conso): recurring costs of the Portfolio / Wave by calendar year and by product, from the consolidated series. */
export default function RunAggregate() {
  const a = useRunAggregate(), years = useMemo(() => (a ? a.years.map((y) => ({ ...y, id: y.label, name: y.label })) : []), [a]);
  const labels = useMemo(() => years.map((y) => y.label), [years]);
  const series = useMemo(() => (a ? [{ label: 'Team & agentic run', data: a.years.map((y) => y.team) }, { label: 'Tokens', data: a.years.map((y) => y.token) },
    { label: 'Infra', data: a.years.map((y) => y.infra) }, { label: 'Knowledge Hub', data: a.years.map((y) => y.kh) }] : []), [a]);
  if (!a) return null;
  const t = a.totals;
  return (
    <SectionFrame title={`Agentic Run — Recurring costs — ${a.label}`} help={help}
      result={<>
        <p><Badge tone="teal">RECURRING</Badge> <span className="ac-muted">Consolidated view of the selection: {a.label} ({a.rows.length} planned product{a.rows.length > 1 ? 's' : ''}). Every figure is read from the domain consolidation.</span></p>
        <Band items={[['Run cost (horizon)', fmtK(t.run)], ['Team & agentic run', fmtK(t.team)], ['Tokens', fmtK(t.token)], ['Infra', fmtK(t.infra)], ['Knowledge Hub', fmtK(t.kh)], ['Team FTE (end)', fmt1(t.etp)]]} />
        <Bars labels={labels} series={series} label={`Run cost by calendar year — ${a.label}`} yTitle="€/year" />
        <AggregateTable caption={`Recurring costs by calendar year — ${a.label}`} first="Year" rows={years} columns={cols<typeof years[number]>()} edit={false} totals={{ label: `Total — ${a.label}`, cells: cells(t) }} />
        <AggregateTable caption={`Recurring costs by product — ${a.label}`} rows={a.rows} columns={cols<typeof a.rows[number]>()} edit={false} totals={{ label: `Total — ${a.label}`, cells: cells(t) }} />
        <ExcludedNote excluded={a.excluded} />
      </>} />
  );
}
