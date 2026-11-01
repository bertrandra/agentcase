import { useId, useMemo } from 'react';
import { FilterSelect } from '@/ui/widgets/TableControls';
import { optionsOf, type Row } from './tableModel';
import { clearFilters, setFilter, useProcessView, type Filters as F } from './view';

/** The activity table's filters (spec § 8): phase, actor, type, scope, regulatory, and a text search on id and name. */
export function Filters({ rows, shown }: { rows: Row[]; shown: number }) {
  const f = useProcessView((s) => s.filters), id = useId();
  // the option lists follow the rows only (memoised rows keep their identity, FX-41): a filter change or an edit elsewhere does not rebuild them
  const { phases, actors, types } = useMemo(() => ({
    phases: [...new Map(rows.map((r) => [r.phase, r.phaseName])).entries()],
    actors: optionsOf(rows, (r) => r.role).concat(optionsOf(rows, (r) => r.agent)).map((a): [string, string] => [a, a]),
    types: optionsOf(rows, (r) => r.type).map((t): [string, string] => [t, t]),
  }), [rows]);
  const pick = <K extends keyof F,>(k: K, label: string, opts: [string, string][]) => (
    <FilterSelect label={label} value={f[k]} options={opts} onChange={(v) => setFilter(k, v as F[K])} />
  );
  return (
    <div className="ac-form-row ac-proc-filters" role="search" aria-label="Filter the activities">
      {pick('phase', 'Phase', phases)}
      {pick('actor', 'Actor', actors)}
      {pick('type', 'Type', types)}
      {pick('scope', 'Scope', [['in', 'In scope'], ['out', 'Out of scope']])}
      {pick('regulatory', 'Regulatory', [['yes', 'Regulatory'], ['no', 'Not regulatory']])}
      <label htmlFor={`${id}-q`}>Search</label>
      <input id={`${id}-q`} type="search" value={f.text} onChange={(e) => setFilter('text', e.target.value)} placeholder="Id or name" />
      <button type="button" onClick={clearFilters}>Clear filters</button>
      <span className="ac-muted" aria-live="polite">{shown} of {rows.length} activities</span>
    </div>
  );
}
