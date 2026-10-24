import { useMemo } from 'react';
import { agentRunTable, type RunRow } from '@/domain/tuneB/tokens';
import { useCtx } from '@/store/hooks';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { eur, int } from '../../tuneB/fmt';

/** The year columns and the totals shared by both run tables. */
export function runColumns(H: number): Column<RunRow>[] {
  return [
    ...Array.from({ length: H }, (_, i): Column<RunRow> => ({ key: `y${i}`, header: `Run Y${i + 1}`, align: 'right', render: (r) => int(r.runs[i] as number) })),
    { key: 'tot', header: 'Run total', align: 'right', render: (r) => <strong>{int(r.total)}</strong> },
    { key: 'tok', header: `Tokens ${H}y (M)`, align: 'right', render: (r) => `${r.tokM.toFixed(r.phase ? 2 : 1)} M` },
    { key: 'cost', header: `Cost ${H}y (€)`, align: 'right', render: (r) => eur(r.cost) },
  ];
}

/** Agent runs, tokens and run cost by model and year over the horizon. */
export function AgentRuns() {
  const c = useCtx(), t = useMemo(() => agentRunTable(c), [c]), H = t.totals.runs.length;
  const columns: Column<RunRow>[] = [
    { key: 'a', header: 'Agent (model)', render: (r) => (r.key === 'total' ? <strong>{r.label}</strong> : r.label) },
    { key: 'mix', header: 'Mix %', align: 'center', render: (r) => `${Math.round(r.mix ?? 0)}%` },
    ...runColumns(H),
  ];
  return (
    <Panel title="🤖 Agent runs & run cost by year">
      <p className="ac-muted">Agent executions (runs) per year, split across models by the usage mix, with the resulting token volume and run cost over
        the {H}-year horizon. Runs scale with scope, realized automation and the adoption ramp.</p>
      <DataTable columns={columns} rows={[...t.rows, t.totals]} rowKey={(r) => r.key} />
    </Panel>
  );
}
