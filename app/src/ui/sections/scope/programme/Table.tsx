import type { ProgrammeTable as Table } from '@/domain/programme';
import { eurK } from '@/ui/sections/tuneB/fmt';
import { SortHeader } from '@/ui/widgets/TableControls';
import { ProgrammeRowView } from './Row';
import { sortBy, useProgrammeScreen, visibleRows, type SortKey } from './view';

const COLS: [SortKey | null, string][] = [
  ['enabled', 'Enabled'], ['name', 'Activity'], [null, 'Description'], ['type', 'Type'], [null, 'Start / duration'], ['cost', 'Cost'],
];

/**
 * The programme's activities, one per row (F-B79): Enabled, activity, description, type, start / duration, cost with its rule, the cost by horizon
 * year in the euro result, the linked section and "Open in Process". Sortable headers; a totals row (the engine's programme cost by year).
 */
export function ProgrammeTableView({ t, multi }: { t: Table; multi: boolean }) {
  const f = useProgrammeScreen((s) => s.filters), sort = useProgrammeScreen((s) => s.sort), open = useProgrammeScreen((s) => s.open);
  const rows = visibleRows(t.rows, f, sort), Y = t.years.length, cols = COLS.length + Y + 1;
  const head = ([key, label]: [SortKey | null, string]) => <SortHeader key={label} k={key} label={label} sort={sort} onSort={sortBy} />;
  return (
    <div className="ac-table-wrap" tabIndex={0} role="region" aria-label="Programme activities">
      <table className="ac-table">
        <caption className="ac-sr">Activities of the transformation programme: enabled, description, type, timing, cost by year, linked section</caption>
        <thead>
          <tr>{COLS.map(head)}{t.years.map((_, y) => <th key={y} scope="col">{`Y${y + 1}`}</th>)}<th scope="col">Linked section</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => <ProgrammeRowView key={r.id} r={r} open={open === r.id} years={Y} multi={multi} cols={cols} />)}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={COLS.length}>{`Programme cost in the euro result: ${eurK(t.total)} over the horizon (the pilot, ${eurK(t.pilot)}, `
              + 'is outside it)'}</th>
            {t.years.map((x, y) => <td key={y} className="ac-proc-num">{eurK(x)}</td>)}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
