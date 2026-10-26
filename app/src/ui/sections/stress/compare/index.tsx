import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { compareData, type CompareData, type Trajectory } from '@/domain/stress';
import { useCtx } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { RangeInput } from '@/ui/widgets/fields';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { useTheme } from '@/ui/themeContext';
import type { Tok } from '@/domain/theme/resolve';
import type { TokenName } from '@/domain/theme';

const help = (
  <p>Three trajectories compared: AS-IS (status quo) · AS-IS + saving (classic continuous improvement at x%/yr, adjustable) · Agentic (this transformation).
    Choose the classic annual saving rate below.</p>
);
const SERIES: { key: 'asis' | 'classic' | 'agentic'; label: string; bg: TokenName; border: TokenName }[] = [
  { key: 'asis', label: 'AS-IS', bg: 'warning-500-a70', border: 'warning-600' },
  { key: 'classic', label: 'AS-IS + saving', bg: 'primary-500-a70', border: 'info-700' },
  { key: 'agentic', label: 'Agentic', bg: 'success-500-a80', border: 'teal-700' },
] as const;

function chartOf(d: CompareData, key: keyof Trajectory, line: boolean, tok: Tok): ChartConfiguration {
  return { type: line ? 'line' : 'bar',
    data: { labels: d.labels,
    datasets: SERIES.map((s) =>
    ({ label: s.label, data: d[s.key][key], backgroundColor: tok(s.bg), borderColor: tok(s.border), borderWidth: 2, fill: false })) },
    options: { plugins: { legend: { position: 'top' } } } };
}

/** 3-way comparison — AS-IS / AS-IS + classic saving / Agentic: four side-by-side charts and the key-figures table. */
export default function CompareSection() {
  const c = useCtx(), d = useMemo(() => compareData(c), [c]);
  const { tok } = useTheme();
  const cfg = useMemo(() =>
    ({ fte: chartOf(d, 'fte', false, tok), cost: chartOf(d, 'cost', false, tok), save: chartOf(d, 'save', true, tok), velo: chartOf(d, 'velo', false, tok) }),
    [d, tok]);
  return (
    <SectionFrame title="3-way Comparison — AS-IS / AS-IS + saving / Agentic" help={help}
      input={<RangeInput id="classicSaving" label="Classic annual saving — optimized AS-IS scenario" min={0} max={15} unit="%/yr" />}
      result={<>
        <Panel title="Side-by-side charts">
          <h3>Headcount / vFTE (FTE)</h3><ChartPanel config={cfg.fte} label="Headcount by year" height={220} />
          <h3>Annual cost (€)</h3><ChartPanel config={cfg.cost} label="Annual cost by year" height={220} />
          <h3>Cumulative saving (€)</h3><ChartPanel config={cfg.save} label="Cumulative saving by year" height={220} />
          <h3>Velocity (story points / sprint)</h3><ChartPanel config={cfg.velo} label="Velocity by year" height={220} />
        </Panel>
        <Panel title="Key figures — comparison">
          <DataTable columns={['Metric', 'AS-IS', 'AS-IS + saving', 'Agentic',
            'Agentic vs AS-IS'].map((h, i) => ({ key: h, header: h, align: i ? 'center' as const : 'left' as const,
            render: (r: string[]) => (i === 0 ? <strong>{r[0]}</strong> : r[i]) }))} rows={d.rows} rowKey={(r) => r[0] as string} />
        </Panel>
      </>} />
  );
}
