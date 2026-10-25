import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { agentUsage } from '@/domain/verifyA';
import { fmt1, fmtE } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Band } from '../../economics/Band';
import { SimpleTable } from '../SimpleTable';
import { useLive } from '../useLive';
import { useTheme } from '@/ui/themeContext';
import { cssVars } from '@/ui/cssVars';

const help = (
  <>
    <p>How intensively agents are used in your configured scenario: token consumption, agent effort (vFTE) by phase and by authorization level, and the FinOps cost build-up.</p>
    <p>Everything recomputes from your parameters (team, automation, ramp, scope, token price). Relative agent effort = artefacts × automatable %.</p>
  </>
);

/** Agent usage — consumption for this case, by year, by phase and by authorization level. */
export default function AgentUsageSection() {
  const live = useLive(), u = agentUsage(live), s = u.summary, { tok } = useTheme();
  const cfg = useMemo((): ChartConfiguration => ({ type: 'bar', data: { labels: u.phases.map((p) => p.id), datasets: [{ label: 'Relative agent effort', data: u.phases.map((p) => p.effort), backgroundColor: tok('primary-700') }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'artifacts × automatable %' } } } } }), [u.phases, tok]);
  return (
    <SectionFrame title="📊 Agent usage — consumption for this case" help={help}
      result={<>
        <Band items={[[`Agent vFTE ${s.endLabel}`, fmt1(s.vfte)], [`Artifacts/month ${s.endLabel}`, String(Math.round(s.artsPerMonth))], [`Tokens ${s.endLabel}`, `${Math.round(s.tokensM)}M`],
          [`Token cost ${s.endLabel}`, fmtE(s.tokenCost)], ['In-scope artifacts', `${s.count}/${s.totalArt}`]]} />
        <Panel title="🔢 Token & agent-effort consumption by year">
          <SimpleTable align={['left', 'center', 'right', 'right', 'right', 'right', 'right']} head={['Year', 'Ramp', 'Agent vFTE', 'Artifacts/month', 'Tokens/year', 'Token €/year', 'Infra €/year']}
            rows={u.years.map((y) => ({ key: y.label, cells: [<b>{y.label}</b>, `${Math.round(y.ramp)}%`, fmt1(y.vfte), Math.round(y.arts), `${Math.round(y.tokensM)}M`, fmtE(y.tokenCost), fmtE(y.infra)] }))} />
        </Panel>
        <Panel title="🤖 Agent effort by phase (Y3, in scope)">
          <ChartPanel config={cfg} label="Relative agent effort by phase" height={220} />
          <SimpleTable align={['left', 'center', 'center', 'left']} head={['Phase', 'Artifacts', 'Avg automatable %', 'Relative agent effort']}
            rows={u.phases.map((p) => ({ key: p.id, cells: [<><b>{p.id}</b> {p.name}</>, p.n, `${p.avgAgent}%`,
              <div className="ac-bar ac-effort-bar" role="img" aria-label={`${p.id} relative agent effort`}>
                <span style={cssVars({ '--dyn-bar-pct': `${Math.round((p.effort / u.maxEffort) * 100)}%` })} />{/* dynamic: the phase's share of the effort */}
              </div>] }))} />
        </Panel>
        <Panel title="🔐 Agent effort by authorization level (Y3)">
          <SimpleTable align={['left', 'center', 'center', 'center']} head={['Authorization', 'Artifacts', 'Avg automatable %', 'Share of agent effort']}
            rows={u.auth.map((a) => ({ key: a.level, cells: [<b>{a.level}</b>, a.n, `${a.avgAgent}%`, <b>{Math.round(a.share)}%</b>] }))} />
        </Panel>
      </>} />
  );
}
