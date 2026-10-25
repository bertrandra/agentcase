import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { fmtRoiPct, yLabel } from '@/domain/economics';
import { fmt1, fmtE, fmtK, pct0 } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Band } from '../Band';
import { runBars } from '../charts';
import { useEconomics } from '../useEconomics';

const help = (
  <>
    <p>Year-by-year cost build-up: residual team + setup + run (tokens/infra) and the resulting saving vs baseline.</p>
    <p>Run(y) = Team cost(y) + Tokens(y) + Infra + Agentic run. Saving(y) = Baseline − Run(y). Costs and savings are sums of the monthly rows; FTE and
      adoption are year-end samples.</p>
  </>
);

/** Annual summary — the Time Engine aggregated per year of the horizon. */
export default function AnnualSection() {
  const { tok } = useTheme(), v = useEconomics(), end = v.years[v.H - 1], first = v.years[0];
  const cfg = useMemo(() => runBars(v, { label: (i) => `Year ${i + 1}`, names: ['Team cost', 'Agentic run (team)'], yTitle: true }, tok), [v, tok]);
  if (!end || !first) return null;
  const items: [string, string][] = [['AS-IS cost/yr', fmtK(v.baselineRun)], ['Run Y1', fmtK(first.totalRunCost)],
    [`Run ${yLabel(v.H)}`, fmtK(end.totalRunCost)],
    [`Saving ${yLabel(v.H)}`, fmtK(end.savings)], ['Setup', fmtK(v.setup)], [`ROI ${v.H} year${v.H > 1 ? 's' : ''} (net)`, fmtRoiPct(v.roi)]];
  return (
    <SectionFrame title="Annual summary" help={help}
      result={<>
        <Band items={items} />
        <p className="ac-muted">Annual costs: team + Setup + Run (tokens/infra)</p>
        <ChartPanel config={cfg} label="Annual cost by component" height={280} />
        <DataTable caption="Detailed annual table" rows={v.years} rowKey={(y) => String(y.yearIndex)} columns={[
          { key: 'y', header: 'Year', render: (_y, i) => <strong>Year {i + 1}</strong> },
          { key: 'r', header: 'Ramp', align: 'center', render: (y) => pct0(y.adoptionEndPct) },
          { key: 'h', header: 'Human FTE', align: 'right', render: (y) => fmt1(y.humanFteEnd) },
          { key: 'a', header: 'Agent vFTE', align: 'right', render: (y) => fmt1(y.agentVfteEnd) },
          { key: 't', header: 'Team cost', align: 'right', render: (y) => fmtK(y.teamCost) },
          { key: 'k', header: 'Token cost', align: 'right', render: (y) => fmtE(y.tokenCost) },
          { key: 'i', header: 'Infra cost', align: 'right', render: (y) => fmtE(y.infrastructureCost) },
          { key: 's', header: 'Setup', align: 'right', render: (_y, i) => (i === 0 ? fmtK(v.setup) : '—') },
          { key: 'tot', header: 'Total', align: 'right', render: (y, i) => fmtK(y.totalRunCost + (i === 0 ? v.setup : 0)) },
          { key: 'sv', header: 'Saving vs AS-IS', align: 'right', render: (y) => <b>{fmtK(y.savings)}</b> },
        ]} />
      </>} />
  );
}
