import { useMemo } from 'react';
import { runSizingView } from '@/domain/tuneB/runSizing';
import { useCtx } from '@/store/hooks';
import { DataTable } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { ActivityRefs } from '@/ui/widgets/ActivityRefs';
import { eur, fix } from '../../tuneB/fmt';

/**
 * The live per-year preview of the sizing policy (agent vFTE, run team FTE and cost, agents per run FTE). The policy (mode, platform floor, ops
 * load per agent) is a parameter of the AgentOps run activity, edited in the Process section (SPEC_BPMN § 19.7, phase B9a).
 */
export function SizingPolicy() {
  const c = useCtx(), v = useMemo(() => runSizingView(c), [c]);
  const rows = [
    { key: 'av', label: 'Agent vFTE', cells: v.av.map((x) => fix(x, 2)) },
    { key: 'rt', label: 'Run team (FTE)', cells: v.rt.map((x) => fix(x, 2)), bold: true },
    { key: 'rc', label: 'Run team cost', cells: v.rc.map(eur) },
    { key: 'pf', label: 'Agents per run FTE', cells: v.perFte.map((x) => (x == null ? '—' : fix(x, 1))) },
  ];
  return (
    <Panel title="Sizing policy">
      <ActivityRefs kinds={['agentops']} />
      <DataTable rowKey={(r) => r.key} rows={rows} columns={[
        { key: 'l', header: '', render: (r) => r.label },
        ...v.av.map((_, i) => ({
          key: `y${i}`, header: `Year ${i + 1}`, align: 'center' as const,
          render: (r: (typeof rows)[number]) => (r.bold ? <strong>{r.cells[i]}</strong> : r.cells[i]),
        })),
      ]} />
      <p className="ac-muted">Live on the current scenario (automation {fix(v.eff, 1)}%). Change the sliders in Parameters and this table follows.</p>
    </Panel>
  );
}
