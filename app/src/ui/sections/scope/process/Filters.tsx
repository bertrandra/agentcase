import { useId } from 'react';
import { optionsOf, type Row } from './tableModel';
import { clearFilters, setFilter, useProcessView, type Filters as F } from './view';

/** The activity table's filters (spec § 8): phase, actor, type, scope, regulatory, and a text search on id and name. */
export function Filters({ rows, shown }: { rows: Row[]; shown: number }) {
  const f = useProcessView((s) => s.filters), id = useId();
  const phases = [...new Map(rows.map((r) => [r.phase, r.phaseName])).entries()];
  const actors = optionsOf(rows, (r) => r.role).concat(optionsOf(rows, (r) => r.agent));
  const pick = <K extends keyof F,>(k: K, label: string, opts: [string, string][]) => (
    <label>{label}{' '}
      <select value={f[k]} onChange={(e) => setFilter(k, e.target.value as F[K])}>
        <option value="">All</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
  return (
    <div className="ac-form-row ac-proc-filters" role="search" aria-label="Filter the activities">
      {pick('phase', 'Phase', phases)}
      {pick('actor', 'Actor', actors.map((a) => [a, a]))}
      {pick('type', 'Type', optionsOf(rows, (r) => r.type).map((t) => [t, t]))}
      {pick('scope', 'Scope', [['in', 'In scope'], ['out', 'Out of scope']])}
      {pick('regulatory', 'Regulatory', [['yes', 'Regulatory'], ['no', 'Not regulatory']])}
      <label htmlFor={`${id}-q`}>Search</label>
      <input id={`${id}-q`} type="search" value={f.text} onChange={(e) => setFilter('text', e.target.value)} placeholder="Id or name" />
      <button type="button" onClick={clearFilters}>Clear filters</button>
      <span className="ac-muted" aria-live="polite">{shown} of {rows.length} activities</span>
    </div>
  );
}
