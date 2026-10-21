import { useMemo } from 'react';
import { yearSeries, yLabel } from '@/domain/economics';
import { fmt1, fmtE } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Callout, Panel } from '@/ui/widgets/cards';
import { Band } from '../Band';
import { GridTable } from '../GridTable';
import { useEconomics } from '../useEconomics';
import { fteShift } from './charts';

/** Workforce shift: human FTE down, agent vFTE up, with the human and agent (token) cost per year. */
export function FteShift() {
  const v = useEconomics(), s = yearSeries(v.years), e = v.H - 1, cfg = useMemo(() => fteShift(v), [v]);
  const rows = v.years.map((y, i) => ({
    key: String(i), label: <strong>{yLabel(i + 1)}</strong>,
    cells: [fmt1(y.humanFteEnd), fmtE(s.team[i] as number), fmt1(y.agentVfteEnd), fmtE(s.token[i] as number), fmtE((s.team[i] as number) + (s.token[i] as number))],
  }));
  return (
    <Panel title="Workforce Shift — Human FTE to Agent vFTE (with costs)">
      <Callout>Human effort decreases, agent vFTE grows, total effort conserved. Costs shown: human headcount + agent execution (infrastructure &amp; agentic run team are in Operating Costs).</Callout>
      <ChartPanel config={cfg} label="Human FTE and agent vFTE over the horizon" height={260} />
      <GridTable head={['Year', 'Human FTE', 'Human Cost (€)', 'Agent vFTE', 'Agent Cost (€)', 'Human + agent cost (€)']} rows={rows} />
      <Band items={[[`FTE freed ${yLabel(v.H)}`, fmt1(v.freed[e] as number)], [`Human cost ${yLabel(v.H)}`, fmtE(s.team[e] as number)], [`Agent cost ${yLabel(v.H)}`, fmtE(s.token[e] as number)]]} />
    </Panel>
  );
}
