import { useStoryAggregate } from '@/store/selectionHooksPresent';
import { fmtK } from '@/ui/economicsFormat';
import { fmtMonths } from '@/ui/format';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { DataTable } from '@/ui/widgets/DataTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ExcludedNote } from '../../economics/AggParts';

const help = (
  <p>The narrative of the <strong>selection</strong> (Portfolio or one Wave): baseline vs target across team, cost and delivery. Headcount and baseline cost add up over the planned products; delivery velocity is
    weighted by entry headcount; savings, run cost and payback are those of the consolidated calendar flows (the last calendar year of the horizon). Each product keeps its own story in the table below.</p>
);
const R = 'right' as const;

/** The story so far — aggregate view (R-conso): AS-IS to TO-BE of the Portfolio / Wave, and the story of each product. */
export default function StoryAggregate() {
  const a = useStoryAggregate();
  if (!a) return null;
  const s = a.story, rows: [string, string, string][] = [
    ['Headcount (FTE)', s.baseFte.toFixed(1), s.tgtFte.toFixed(1)], ['Run cost / yr', fmtK(s.baselineRun), fmtK(s.endRun)], ['Delivery velocity', 'baseline', `+${Math.round(s.velocityPct)}%`],
    [`${s.endLabel} savings`, '—', fmtK(s.endSavings)], ['Payback', '—', fmtMonths(s.paybackMonth)],
  ];
  const cols: AggColumn<(typeof a.rows)[number]>[] = [
    { key: 'base', header: 'AS-IS FTE', align: R, render: (r) => r.baseFte.toFixed(1) }, { key: 'tgt', header: 'TO-BE FTE', align: R, render: (r) => r.tgtFte.toFixed(1) },
    { key: 'asis', header: 'AS-IS run / yr', align: R, render: (r) => fmtK(r.baselineRun) }, { key: 'end', header: 'TO-BE run / yr', align: R, render: (r) => fmtK(r.endRun) },
    { key: 'vel', header: 'Velocity', align: R, render: (r) => `+${r.velocityPct}%` }, { key: 'sav', header: 'Savings (last year)', align: R, render: (r) => fmtK(r.endSavings) },
    { key: 'pay', header: 'Payback', align: R, render: (r) => (r.payback ? `${r.payback} mo` : `>${r.horizon * 12}m`) },
  ];
  return (
    <SectionFrame title={`📖 The story so far — AS-IS → TO-BE — ${a.label}`} help={help}
      result={<>
        <p style={{ fontSize: 15, color: 'var(--ac-blue)' }}>{a.label} moves the team from <strong>{s.baseFte.toFixed(1)} FTE</strong> to <strong>{s.tgtFte.toFixed(1)} FTE</strong> by {s.endLabel},
          at <strong>+{Math.round(s.velocityPct)}%</strong> delivery velocity, saving <strong>{fmtK(s.endSavings)}</strong> in {s.endLabel} with a payback of <strong>{fmtMonths(s.paybackMonth)}</strong>.</p>
        <DataTable caption={`AS-IS vs TO-BE — ${a.label}`} rows={rows} rowKey={(r) => r[0]} columns={[
          { key: 'k', header: '', title: 'Measure', render: (r) => r[0] }, { key: 'a', header: 'AS-IS', align: 'center', render: (r) => r[1] },
          { key: 'b', header: `TO-BE (${s.endLabel})`, align: 'center', render: (r) => <b>{r[2]}</b> }]} />
        <AggregateTable caption={`Story by product — ${a.label}`} rows={a.rows} columns={cols} edit={false}
          totals={{ label: `Total — ${a.label}`, cells: { base: s.baseFte.toFixed(1), tgt: s.tgtFte.toFixed(1), asis: fmtK(s.baselineRun), end: fmtK(s.endRun), vel: `+${Math.round(s.velocityPct)}%`, sav: fmtK(s.endSavings), pay: fmtMonths(s.paybackMonth) } }} />
        <p className="ac-muted">Product lines are read on each product&apos;s own horizon; the total line is on the calendar of the selection. Confidence grading is per product, once the Modelling Engine&apos;s P6 evidence ledger is enabled.</p>
        <ExcludedNote excluded={a.excluded} />
      </>} />
  );
}
