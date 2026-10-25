import { useMemo } from 'react';
import { artifactRunTable, type RunRow } from '@/domain/tuneB/tokens';
import { useCtx } from '@/store/hooks';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { runColumns } from './AgentRuns';

/** Agent runs allocated to each in-scope artefact (effort × agent supervision), grouped by phase. */
export function ArtifactRuns() {
  const c = useCtx(), t = useMemo(() => artifactRunTable(c), [c]), H = t.totals.runs.length;
  const total = (r: RunRow) => r.key === 'total';
  const columns: Column<RunRow>[] = [
    { key: 'ph', header: 'Phase', render: (r) => (total(r) ? <strong>{r.label}</strong> : r.phase) },
    { key: 'pd', header: 'Phase Description', render: (r) => r.phaseName ?? '' },
    { key: 'art', header: 'Artifact', render: (r) => (total(r) ? '' : <>{r.isReg && <b className="ac-reg">REG </b>}{r.label}</>) },
    ...runColumns(H),
  ];
  return (
    <Panel title="📦 Agent runs by artifact (in-scope)">
      <p className="ac-muted">Same agent executions, allocated to each in-scope artifact in proportion to its agent-execution intensity (effort × agent
        supervision). Grouped by phase. Cost uses the blended €/1M; the totals match the by-model table above.</p>
      <DataTable columns={columns} rows={[...t.rows, t.totals]} rowKey={(r) => r.key} empty="No artifact in scope." />
    </Panel>
  );
}
