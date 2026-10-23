import { artifactRuns, type Live } from '@/domain/verifyA';
import { Panel } from '@/ui/widgets/cards';
import { SimpleTable, type TRow } from '../SimpleTable';
import { tok } from '@/domain/theme';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const eur = (v: number) => `€${n0(v)}`;

/** Agent executions allocated to each in-scope artefact (share = effort × automatable %), grouped by phase; regulated artefacts are flagged REG. */
export function Runs({ live }: { live: Live }) {
  const r = artifactRuns(live), ys = Array.from({ length: r.years }, (_, i) => i);
  const rows: TRow[] = r.rows.map((x, i) => ({
    key: `${i}:${x.name}`, style: x.reg ? { background: `var(--ac-amber-bg, ${tok('warning-55')})` } : undefined,
    cells: [x.phase, x.phaseName, <>{x.reg && <b style={{ marginRight: 5, fontSize: 'var(--ac-font-size-xs)' }}>REG</b>}{x.name}</>, ...x.runs.map(n0), <b>{n0(x.total)}</b>, `${x.tokM.toFixed(2)} M`, eur(x.cost)],
  }));
  rows.push({ key: 'total', style: { fontWeight: 'var(--ac-font-weight-bold)' }, span: { 0: 3 }, cells: [`Total (${r.count} in-scope)`, ...r.totals.runs.map(n0), n0(r.totals.total), `${r.totals.tokM.toFixed(1)} M`, eur(r.totals.cost)] });
  const align = ['left', 'left', 'left', ...ys.map(() => 'right' as const), 'right', 'right', 'right'] as ('left' | 'right')[];
  return (
    <Panel title="📦 Agent runs by artifact (in-scope)">
      <p className="ac-muted">Same agent executions as Token economics, allocated to each in-scope artifact — aligned with the "Agent runs by artifact" table there. Grouped by phase; regulated artifacts are flagged REG.</p>
      <SimpleTable align={align} head={['Phase', 'Phase Description', 'Artifact', ...ys.map((i) => `Run Y${i + 1}`), 'Run total', `Tokens ${r.years}y (M)`, `Cost ${r.years}y (€)`]} rows={rows} />
    </Panel>
  );
}
