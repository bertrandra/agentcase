import { useMemo } from 'react';
import { kpiView } from '@/domain/verifyB';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { kpiChart } from '../vbCharts';
import { CompareTable, MetricCards, useView } from '../vbShared';

const HEAD = ['Metric', 'AS-IS'];

/** KPI scorecard: the initial state (input team) against the horizon end, with every figure the case drives. */
export default function KpiSection() {
  const v = useView(kpiView), cfg = useMemo(() => kpiChart(v), [v]), head = [...HEAD, v.endL, 'Change'];
  return (
    <SectionFrame title="KPI Scorecard — AS-IS vs end of transformation"
      help={<p>Consolidated dashboard: initial state (input team) vs the horizon end. Economic KPIs are driven by your parameters; quality and velocity KPIs by the anchors and the in-scope automatable intensity.</p>}
      result={<>
        <p className="ac-muted">Consolidated dashboard: initial state (input team) vs Y3 target. Economic KPIs driven by your parameters.</p>
        <MetricCards cards={v.cards} />
        <ChartPanel config={cfg} label="Index of the horizon-end state against AS-IS = 100" height={260} />
        <CompareTable caption="💰 Economic & Capacity KPIs" head={head} rows={v.eco} />
        <CompareTable caption="⚡ Velocity & Quality KPIs" head={head} rows={v.vq} />
        <CompareTable caption="🔐 Compliance KPIs" head={head} rows={v.comp} />
      </>} />
  );
}
