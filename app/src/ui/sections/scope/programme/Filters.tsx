import { COST_PROFILES, PROGRAMME_PHASES, type ProgrammeRow } from '@/domain/programme';
import { FilterSelect } from '@/ui/widgets/TableControls';
import { clearFilters, setFilter, useProgrammeScreen, visibleRows, type Filters as F } from './view';

/** The programme table's filters (§ 19.11): phase, product level (once for the case / per product), type, enabled. */
export function Filters({ rows }: { rows: ProgrammeRow[] }) {
  const f = useProgrammeScreen((s) => s.filters), shown = visibleRows(rows, f, { key: null, dir: 1 }).length;
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
      <span className="ac-muted" aria-live="polite">{`${shown} of ${rows.length} activities and milestones`}</span>
    </div>
  );
}
