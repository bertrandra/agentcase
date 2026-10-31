import type { ProgrammeAggRow } from '@/domain/portfolio/aggProgramme';
import { useScopeProgramme } from '@/store/selectionHooksProgramme';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { eurK } from '@/ui/sections/tuneB/fmt';
import { InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const;
const help = <p>Aggregate view of the programme of each product: the activities that count, the opt-in activities switched on, the cost lines laid on
  the months by a type other than Spread, and the programme cost of its euro result by year and in total (the pilot outside it).</p>;

/** 📋 Programme — Aggregate view: the programme of each product (the Portfolio or a Wave in view). */
export default function ProgrammeAggregate() {
  const a = useScopeProgramme(), vs = useViewScope();
  const cols: AggColumn<ProgrammeAggRow>[] = [
    { key: 'wave', header: 'Wave', render: (r) => r.wave },
    { key: 'enabled', header: 'Enabled activities', align: R, render: (r) => `${r.enabled}/${r.activities}` },
    { key: 'opt', header: 'Opt-in switched on', render: (r) => r.optIns.join(', ') || '—' },
    { key: 'typed', header: 'Lines not spread', align: R, render: (r) => String(r.typed) },
    ...a.years.map((_, y): AggColumn<ProgrammeAggRow> => ({ key: `y${y}`, header: `Y${y + 1}`, align: R, render: (r) => eurK(r.years[y] ?? 0) })),
    { key: 'total', header: 'Programme cost', align: R, render: (r) => eurK(r.total) },
    { key: 'pilot', header: 'Pilot (outside)', align: R, render: (r) => eurK(r.pilot) },
  ];
  const cells: Record<string, string> = { total: eurK(a.total), pilot: eurK(a.pilot) };
  a.years.forEach((x, y) => { cells[`y${y}`] = eurK(x); });
  return (
    <InputAggregate title="📋 Programme" help={help} intro="each product's programme follows its own values (opt-in switches, types, durations).">
      <AggregateTable caption={`Programme by product — ${vs.label}`} rows={a.rows} columns={cols} totals={{ label: `Products — ${vs.label}`, cells }} />
    </InputAggregate>
  );
}
