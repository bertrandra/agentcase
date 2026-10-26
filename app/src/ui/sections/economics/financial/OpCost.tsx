import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { yLabel } from '@/domain/economics';
import { fmtE } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Panel } from '@/ui/widgets/cards';
import { Band } from '../Band';
import { GridTable, type GridRow } from '../GridTable';
import { useEconomics } from '../useEconomics';
import { costMix } from './charts';

/** Operating costs by category and year (their sum is the run cost, no double count), with the end-year cost mix. */
export function OpCost() {
  const { tok } = useTheme(), v = useEconomics(), s = v.series, e = v.H - 1, cfg = useMemo(() => costMix(v, tok), [v, tok]);
  const row = (key: keyof typeof s, label: string, bold = false): GridRow => ({
    key, label, cells: [...s[key].map(fmtE), fmtE(v.avgOf[key])], bold, rule: bold });
  const rows = [row('team', 'Human workforce (target team)'), row('token', 'Agent execution (tokens)'), row('infra', 'Infrastructure & tools'),
    row('agentRun', 'Agentic run team (AI premium)'), row('run', 'Total operating cost', true)];
  return (
    <Panel title="Operating Costs Breakdown">
      <GridTable head={['Cost Category', ...v.years.map((_, i) => `${yLabel(i + 1)} (€)`), `${v.H}y avg (€)`]} rows={rows} />
      <ChartPanel config={cfg} label="Operating cost mix of the end year" height={300} />
      <Band items={[[`${yLabel(v.H)} operating cost`, fmtE(s.run[e] as number)], ['AS-IS baseline run', fmtE(v.baselineRun)],
        [`Run delta ${yLabel(v.H)}`, fmtE(v.runDelta[e] as number)]]} />
    </Panel>
  );
}
