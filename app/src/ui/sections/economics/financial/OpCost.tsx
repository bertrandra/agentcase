import { useMemo } from 'react';
import { avg, yearSeries, yLabel } from '@/domain/economics';
import { fmtE } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Panel } from '@/ui/widgets/cards';
import { Band } from '../Band';
import { GridTable, type GridRow } from '../GridTable';
import { useEconomics } from '../useEconomics';
import { costMix } from './charts';

/** Operating costs by category and year (their sum is the run cost, no double count), with the end-year cost mix. */
export function OpCost() {
  const v = useEconomics(), s = yearSeries(v.years), e = v.H - 1, cfg = useMemo(() => costMix(v), [v]);
  const row = (key: string, label: string, a: number[], bold = false): GridRow => ({ key, label, cells: [...a.map(fmtE), fmtE(avg(a))], bold, rule: bold });
  const rows = [row('team', 'Human workforce (target team)', s.team), row('tok', 'Agent execution (tokens)', s.token), row('infra', 'Infrastructure & tools', s.infra),
    row('run', 'Agentic run team (AI premium)', s.agentRun), row('tot', 'Total operating cost', s.run, true)];
  return (
    <Panel title="Operating Costs Breakdown">
      <GridTable head={['Cost Category', ...v.years.map((_, i) => `${yLabel(i + 1)} (€)`), `${v.H}y avg (€)`]} rows={rows} />
      <ChartPanel config={cfg} label="Operating cost mix of the end year" height={300} />
      <Band items={[[`${yLabel(v.H)} operating cost`, fmtE(s.run[e] as number)], ['AS-IS baseline run', fmtE(v.baselineRun)], [`Run delta ${yLabel(v.H)}`, fmtE((s.run[e] as number) - v.baselineRun)]]} />
    </Panel>
  );
}
