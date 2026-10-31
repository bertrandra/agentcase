import { memo } from 'react';

/**
 * Small controls of a filterable, sortable table (the 🧩 Process activity table, the 📋 Programme table): a column header whose button sorts (with
 * `aria-sort` on the active column) and a filter select whose first option is "All". View state only: the callers keep it in their view store.
 */
function SortHeaderView<K extends string>({ k, label, sort, onSort }: { k: K | null; label: string; sort: { key: K | null; dir: 1 | -1 };
  onSort: (key: K) => void }) {
  const on = k !== null && sort.key === k;
  return (
    <th scope="col" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
      {k ? <button type="button" className="ac-proc-sort" onClick={() => onSort(k)}>{label}{on ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button> : label}
    </th>
  );
}
/** A sortable column header, memoised: an edit of the case re-renders the table body, not its headers (the sort is view state). */
export const SortHeader = memo(SortHeaderView) as typeof SortHeaderView;

export function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[];
  onChange: (v: string) => void }) {
  return (
    <label>{label}{' '}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
