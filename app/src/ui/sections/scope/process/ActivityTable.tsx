import { memo, useState } from 'react';
import { setProcessScope } from '@/controllers/process';
import { fmt1 } from '@/ui/economicsFormat';
import { SortHeader } from '@/ui/widgets/TableControls';
import type { Row } from './tableModel';
import { selectActivity, sortBy, useProcessView, type SortKey } from './view';

/** Rows shown before "Show all" (a long list stays quick to render; the filters narrow it). */
const LIMIT = 100;
const COLS: [SortKey | null, string][] = [
  ['id', 'Id'], ['name', 'Activity'], ['phase', 'Phase'], ['type', 'Type'], ['role', 'Role'], [null, 'Agent'], ['effort', 'Effort'],
  [null, 'Human / agent supervision'], ['scope', 'In scope'],
];

/** One row (memoised: an edit re-renders only the rows whose activity changed, and the two rows of a selection change). */
const RowView = memo(function RowView({ r, on }: { r: Row; on: boolean }) {
  return (
    <tr className={on ? 'is-selected' : undefined}>
      <td>
        <button type="button" className="ac-proc-id" aria-pressed={on} onClick={() => selectActivity(on ? null : r.id)}
          aria-label={`Select ${r.id} ${r.name}`}>{r.id}</button>
      </td>
      <td>{r.name}{r.regulatory && <span className="ac-proc-tag">Regulatory</span>}</td>
      <td>{r.phaseName}{r.phaseOff && <span className="ac-proc-tag">phase off</span>}</td>
      <td>{r.type}</td>
      <td>{r.role}</td>
      <td>{r.agent}</td>
      <td className="ac-proc-num">{fmt1(r.effort)}</td>
      <td className="ac-proc-num">{r.human}% / {r.agentSup}%</td>
      <td>
        <input type="checkbox" checked={r.inScope} onChange={(e) => setProcessScope([r.id], e.target.checked)} aria-label={`${r.id} ${r.name} in scope`} />
      </td>
    </tr>
  );
});

/**
 * The activity table (spec § 8, F-B15): one row per activity, the diagram's accessible alternative. Sortable headers, the activity id selects the
 * activity (diagram highlight and detail panel), the scope check box is the `process.setScope` command (one undoable step).
 */
export function ActivityTable({ rows }: { rows: Row[] }) {
  const sort = useProcessView((s) => s.sort), selected = useProcessView((s) => s.selected), [all, setAll] = useState(false);
  const long = rows.length > LIMIT && !all && rows.findIndex((r) => r.id === selected) < LIMIT, shown = long ? rows.slice(0, LIMIT) : rows;
  const head = ([key, label]: [SortKey | null, string]) => <SortHeader key={label} k={key} label={label} sort={sort} onSort={sortBy} />;
  return (
    <div className="ac-table-wrap ac-proc-table" tabIndex={0} role="region" aria-label="Activities of the process">
      <table className="ac-table">
        <caption className="ac-sr">Activities of the process: the same elements as the diagram, one per row</caption>
        <thead><tr>{COLS.map(head)}</tr></thead>
        <tbody>
          {shown.map((r) => <RowView key={r.id} r={r} on={r.id === selected} />)}
        </tbody>
      </table>
      {long && (
        <p className="ac-muted">Showing the first {LIMIT} of {rows.length} activities (filter to narrow){' '}
          <button type="button" onClick={() => setAll(true)}>Show all {rows.length}</button>
        </p>
      )}
    </div>
  );
}
