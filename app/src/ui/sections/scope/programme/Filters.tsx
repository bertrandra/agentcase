import { COST_PROFILES, groupByDependency, PROGRAMME_PHASES, type ProgrammeRow } from '@/domain/programme';
import { FilterSelect } from '@/ui/widgets/TableControls';
import { clearFilters, grouped, setExpanded, setFilter, useProgrammeScreen, visibleRows, type Filters as F } from './view';

/** The head rows that have dependent lines (the groups the table can open). */
const heads = (rows: ProgrammeRow[]): string[] =>
  groupByDependency(rows, (r) => r.kind).filter((l) => l.depth === 0 && l.dependents.length).map((l) => rows[l.index]!.id);

/** The programme table's filters (§ 19.11): phase, product level (once for the case / per product), type, enabled; open or close every group. */
export function Filters({ rows }: { rows: ProgrammeRow[] }) {
  const f = useProgrammeScreen((s) => s.filters), shown = visibleRows(rows, f, { key: null, dir: 1 }).length;
  const isGrouped = useProgrammeScreen((s) => grouped(s.filters, s.sort)), all = heads(rows);
  const allOpen = useProgrammeScreen((s) => all.every((id) => s.expanded.includes(id)));
  const pick = <K extends keyof F,>(k: K, label: string, opts: readonly (readonly [string, string])[]) => (
    <FilterSelect label={label} value={f[k]} options={opts} onChange={(v) => setFilter(k, v as F[K])} />
  );
  return (
    <div className="ac-form-row ac-proc-filters" role="search" aria-label="Filter the programme activities">
      {pick('phase', 'Phase', PROGRAMME_PHASES.map((p) => [p.id, p.name] as const))}
      {pick('level', 'Product', [['case', 'Once for the case'], ['product', 'Per product']])}
      {pick('type', 'Type', COST_PROFILES.map((p) => [p.id, p.label] as const))}
      {pick('enabled', 'Enabled', [['on', 'Enabled'], ['off', 'Not enabled']])}
      <button type="button" onClick={clearFilters}>Clear filters</button>
      {isGrouped && all.length > 0 && (
        <button type="button" onClick={() => setExpanded(allOpen ? [] : all)}>{allOpen ? 'Hide the dependent lines' : 'Show all dependent lines'}</button>
      )}
      <span className="ac-muted" aria-live="polite">{`${shown} of ${rows.length} activities and milestones`}</span>
    </div>
  );
}
