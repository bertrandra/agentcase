import { useMemo } from 'react';
import { execView } from '@/domain/verifyB';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { execChart } from '../vbCharts';
import { useView } from '../vbShared';

type Row = ReturnType<typeof execView>['rows'][number];

/** Execution timeline: sprint velocity and phase durations (days) AS-IS → Y1 → Y2 → horizon end. */
export default function ExecSection() {
  const v = useView(execView), cfg = useMemo(() => execChart(v), [v]);
  const cell = (k: number) => ({ key: `c${k}`, header: ['AS-IS', 'Y1', 'Y2', v.endL][k] as string, align: 'right' as const, render: (r: Row) => r.cells[k] });
  return (
    <SectionFrame title="Execution Timeline"
      help={<p>Wallclock time savings: sprint velocity and project duration, contextual to the effective automation ramp.</p>}
      result={<>
        <p className="ac-muted">Wallclock time savings: sprint velocity and project duration, contextual to the effective automation ramp.</p>
        <ChartPanel config={cfg} label="Sprint velocity by year" height={240} />
        <DataTable rows={v.rows} rowKey={(r) => r.name} columns={[
          { key: 'p', header: 'Phase', render: (r) => <strong>{r.name}</strong> }, cell(0), cell(1), cell(2), cell(3),
          { key: 'l', header: 'Lever', render: () => 'AI generation + review' },
        ]} />
      </>} />
  );
}
