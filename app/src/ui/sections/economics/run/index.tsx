import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { sum, yLabel } from '@/domain/economics';
import { fmt1, fmtE, fmtK, pct0 } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { Badge } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Band } from '../Band';
import { runBars } from '../charts';
import { useEconomics } from '../useEconomics';

const help = (
  <>
    <p>The recurring annual cost after transformation: the residual human team + the new agentic run team + token consumption + infrastructure.</p>
    <p>Run/year = Team cost + Agentic run + Tokens + Infra. The AI costs are incremental: they are the price of the transformation, subtracted from the
      saving.</p>
  </>
);

/** Agentic run — recurring costs per year (team, agentic run team, tokens, infrastructure). */
export default function RunSection() {
  const { tok } = useTheme(), v = useEconomics(), cfg = useMemo(() => runBars(v, { label: (i) => yLabel(i + 1), names: ['Team', 'Agentic run'] }, tok),
    [v, tok]);
  const items: [string, string][] = [...v.years.slice(0, 3).map((y, i): [string, string] => [`Run ${yLabel(i + 1)}`, fmtK(y.totalRunCost)]),
    ['Cumulative run', fmtK(sum(v.years.map((y) => y.totalRunCost)))]];
  return (
    <SectionFrame title="Agentic Run — Recurring costs" help={help}
      result={<>
        <p><Badge tone="teal">RECURRING</Badge> <span className="ac-muted">Recurring costs: residual team + agentic run (AI Eng, FinOps,
          AI-QA) + tokens + infra. Contextual to the team model.</span></p>
        <Band items={items} />
        <ChartPanel config={cfg} label="Run cost by year: team, agentic run, tokens, infrastructure" height={280} />
        <DataTable rows={v.years} rowKey={(y) => String(y.yearIndex)} columns={[
          { key: 'y', header: 'Year', render: (_y, i) => <strong>{yLabel(i + 1)}</strong> },
          { key: 'r', header: 'Ramp', align: 'center', render: (y) => pct0(y.adoptionEndPct) },
          { key: 'f', header: 'Team FTE', align: 'right', render: (y) => fmt1(y.humanFteEnd) },
          { key: 't', header: 'Team cost', align: 'right', render: (y) => fmtK(y.teamCost) },
          { key: 'a', header: 'Agentic run', align: 'right', render: (y) => fmtK(y.runTeamCost) },
          { key: 'k', header: 'Tokens', align: 'right', render: (y) => fmtE(y.tokenCost) },
          { key: 'i', header: 'Infra', align: 'right', render: (y) => fmtE(y.infrastructureCost) },
          { key: 'tot', header: 'Total Run', align: 'right', render: (y) => <strong>{fmtK(y.totalRunCost)}</strong> },
        ]} />
      </>} />
  );
}
