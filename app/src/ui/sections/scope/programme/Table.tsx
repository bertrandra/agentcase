import { groupByDependency, type ProgrammeRow, type ProgrammeTable as Table } from '@/domain/programme';
import { eurK } from '@/ui/sections/tuneB/fmt';
import { SortHeader } from '@/ui/widgets/TableControls';
import { ProgrammeRowView, type GroupInfo } from './Row';
import { grouped, sortBy, useProgrammeScreen, visibleRows, type SortKey } from './view';

const COLS: [SortKey | null, string][] = [
  ['enabled', 'Enabled'], ['name', 'Activity'], [null, 'Description'], ['type', 'Type'], [null, 'Start / duration'], ['cost', 'Cost'],
];

const horizonCost = (r: ProgrammeRow): number => (r.years ?? []).reduce((a, x) => a + x, 0);
interface Line { r: ProgrammeRow; depth: number; group?: GroupInfo }
/**
 * The rows in display order. Grouped (nothing filters or sorts): each line that depends on another (`domain/programme/dependencies.ts`) sits under
 * it, indented, and a group's dependent lines are hidden until its head is opened (collapsed by default); the row a link asked to show opens its
 * group. Filtered or sorted: every kept line, flat.
 */
function linesOf(rows: ProgrammeRow[], isGrouped: boolean, expanded: readonly string[], focus: string | null): Line[] {
  if (!isGrouped) return rows.map((r) => ({ r, depth: 0 }));
  const g = groupByDependency(rows, (r) => r.kind), out: Line[] = [];
  let open = false;
  for (const l of g) {
    const r = rows[l.index]!;
    if (l.depth === 0) {
      const deps = l.dependents.map((i) => rows[i]!);
      open = expanded.includes(r.id) || deps.some((d) => d.id === focus);
      out.push({ r, depth: 0, group: deps.length ? { count: deps.length, cost: deps.reduce((a, d) => a + horizonCost(d), 0), open } : undefined });
    } else if (open) out.push({ r, depth: l.depth });
  }
  return out;
}

/**
 * The programme's activities, one per row (F-B79): Enabled, activity, description, type, start / duration, cost with its rule, the cost by horizon
 * year in the euro result, the linked section and "Open in Process". Sortable headers; a totals row (the engine's programme cost by year).
 */
export function ProgrammeTableView({ t, multi }: { t: Table; multi: boolean }) {
  const f = useProgrammeScreen((s) => s.filters), sort = useProgrammeScreen((s) => s.sort), open = useProgrammeScreen((s) => s.open);
  const focus = useProgrammeScreen((s) => s.focus), expanded = useProgrammeScreen((s) => s.expanded);
  const lines = linesOf(visibleRows(t.rows, f, sort), grouped(f, sort), expanded, focus), Y = t.years.length, cols = COLS.length + Y + 1;
  const head = ([key, label]: [SortKey | null, string]) => <SortHeader key={label} k={key} label={label} sort={sort} onSort={sortBy} />;
  return (
    <div className="ac-table-wrap" tabIndex={0} role="region" aria-label="Programme activities">
      <table className="ac-table">
        <caption className="ac-sr">Activities of the transformation programme: enabled, description, type, timing, cost by year, linked section</caption>
        <thead>
          <tr>{COLS.map(head)}{t.years.map((_, y) => <th key={y} scope="col">{`Y${y + 1}`}</th>)}<th scope="col">Linked section</th></tr>
        </thead>
        <tbody>
          {lines.map(({ r, depth, group }) => <ProgrammeRowView key={r.id} r={r} open={open === r.id} focused={focus === r.id} years={Y} multi={multi}
            cols={cols} depth={depth} group={group} />)}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={COLS.length}>{`Programme cost in the euro result: ${eurK(t.total)} over the horizon (the pilot, ${eurK(t.pilot)}, `
              + 'included)'}</th>
            {t.years.map((x, y) => <td key={y} className="ac-proc-num">{eurK(x)}</td>)}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
