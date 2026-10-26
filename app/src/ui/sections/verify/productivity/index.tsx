import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { productivityView } from '@/domain/verifyB';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { productivityChart } from '../vbCharts';
import { useView } from '../vbShared';

type Row = ReturnType<typeof productivityView>['rows'][number];
const fmt = (n: number) => String(n);

/** Productivity & throughput: artefacts per engineer per month for the categories in scope. */
export default function ProductivitySection() {
  const v = useView(productivityView), { tok } = useTheme(), cfg = useMemo(() => productivityChart(v, tok), [v, tok]);
  const col = (key: 'asis' | 'y1' | 'y2' | 'y3', header: string) => ({ key, header, align: 'center' as const, render: (r: Row) => fmt(r[key]) });
  const note = v.fallback ? `Selected scope maps to no standard throughput category — showing all, scaled to scope intensity (${v.intensity}% auto).`
    : `Showing ${v.count} categor${v.count > 1 ? 'ies' : 'y'} in scope · scope intensity ${v.intensity}% auto (${v.scopeCount}/${v.totalArt} artifacts).`;
  return (
    <SectionFrame title="Productivity & Throughput"
      help={<p>Artifacts per engineer per month. Categories and uplift reflect only the selected artifacts — narrow the scope to highly-automatable artifacts
        and the gain rises; pick low-automatable ones and it falls.</p>}
      result={<>
        <p className="ac-muted">Artifacts per engineer per month. Categories and uplift now reflect only the selected artifacts — narrow the scope to
          highly-automatable artifacts and the gain rises; pick low-automatable ones and it falls.</p>
        <Callout><strong>How the ramp works.</strong> Adoption is three annual figures (Y1/Y2/Y3). Within a year it is held constant — the model
          computes cost and savings per year, so the twelve months of a year always sum to that year’s value. There is no month-by-month adoption
          curve and the tool does not infer one.</Callout>
        <ChartPanel config={cfg} label="Throughput per engineer per month by category" height={260} />
        <p className="ac-muted ac-productivity-note">{note}</p>
        <DataTable rows={v.rows} rowKey={(r) => r.label} columns={[
          { key: 'type', header: 'Type', render: (r) => <strong>{r.label}</strong> }, col('asis', 'AS-IS'), col('y1', 'Y1'), col('y2', 'Y2'), col('y3', v.endL),
          { key: 'f', header: 'Factor', align: 'center', render: (r) => `${r.factor.toFixed(1)}x` },
        ]} />
      </>} />
  );
}
