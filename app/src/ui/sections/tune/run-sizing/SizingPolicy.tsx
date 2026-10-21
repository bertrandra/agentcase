import { useMemo } from 'react';
import { runSizingView } from '@/domain/tuneB/runSizing';
import { useCtx } from '@/store/hooks';
import { DataTable } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { NumberInput, SelectInput } from '@/ui/widgets/fields';
import { eur, fix } from '../../tuneB/fmt';

const MODES = [
  { value: 'hybrid', label: 'Hybrid — floor + per-agent (default)' },
  { value: 'legacy', label: 'Legacy — fixed on base-team size' },
];

/** Sizing policy inputs and the live per-year preview (agent vFTE, run team FTE and cost, agents per run FTE). */
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
      <div className="ac-form-row">
        <SelectInput id="runSizeMode" label="Mode" options={MODES} />
        <NumberInput id="runFloorMin" label="Platform floor min (FTE)" min={0} step={0.1} />
        <NumberInput id="runFloorPct" label="Platform floor (% of base team)" min={0} step={0.5} />
        <NumberInput id="runOpsPerAgent" label="Ops load per agent vFTE" min={0} step={0.01} />
      </div>
      <DataTable rowKey={(r) => r.key} rows={rows} columns={[
        { key: 'l', header: '', render: (r) => r.label },
        ...v.av.map((_, i) => ({ key: `y${i}`, header: `Year ${i + 1}`, align: 'center' as const, render: (r: (typeof rows)[number]) => (r.bold ? <strong>{r.cells[i]}</strong> : r.cells[i]) })),
      ]} />
      <p className="ac-muted">Live on the current scenario (automation {fix(v.eff, 1)}%). Change the sliders in Parameters and this table follows.</p>
    </Panel>
  );
}
