import { pNegTone } from '@/domain/stress';
import { resultsCore } from '@/domain/verdict';
import { useCtx } from '@/store/hooks';
import { useSimulation } from '@/store/simulation';
import { Panel, StatRow } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { fmtEur } from '../../stress/fmt';
import { useAutoRerun } from '../../stress/useSimulation';
import { VerdictBanner } from './Banner';
import { Kpi } from './Kpi';

const help = (
  <>
    <p>The whole business case on one screen. It aggregates five things computed elsewhere: the confidence-conditional verdict, the deterministic key figures,
      the uncertainty band, where the savings come from, and the human → agent team shift.</p>
    <p>Pure aggregation layer: zero new calculation. Read it in order — verdict (should we?), band (how sure?), attribution (why?), team shift (what changes for people?).</p>
  </>
);

/** Results — consolidated outcome. */
export default function ResultsSection() {
  const c = useCtx(), r = resultsCore(c), { run } = useSimulation(), B = r.last;
  useAutoRerun();
  const s = run?.stats, fin = !!s && isFinite(s.p10);
  return (
    <SectionFrame title="📋 Results — consolidated outcome" help={help}
      result={<>
        <p className="ac-muted">The final output of the business case on one screen: the confidence-conditional verdict, the deterministic key figures, the uncertainty band,
          where the savings come from, and the human → agent team shift.</p>
        <VerdictBanner run={run} />
        <StatRow>
          <Kpi label={`Net benefit (${r.horizon}-yr)`} value={fmtEur(r.net)} tone={r.net < 0 ? 'brick' : 'blue'} sub={`after ${fmtEur(r.setup)} setup`} />
          <Kpi label="ROI" value={r.roi == null ? 'n/a' : `${Math.round(r.roi * 100)}%`} tone={r.roi != null && r.roi < 0 ? 'brick' : 'teal'} sub="on setup investment" />
          <Kpi label="Payback" value={r.payback} tone="blue" sub="cumulative turns positive" />
          <Kpi label="Automation depth" value={`${r.eff.toFixed(1)}%`} tone="amber" sub="eff = auto × ceiling × posture" />
        </StatRow>
        {run && s && fin && (
          <Panel title={`Uncertainty (Monte Carlo, ${s.n} draws)`}>
            <StatRow>
              <Kpi label="P10 downside" value={fmtEur(s.p10)} tone={s.p10 < 0 ? 'brick' : 'teal'} /><Kpi label="P50 median" value={fmtEur(s.p50)} tone="blue" />
              <Kpi label="P90 upside" value={fmtEur(s.p90)} tone="teal" /><Kpi label="P(net < 0)" value={`${Math.round(s.pNetNeg * 100)}%`} tone={pNegTone(s.pNetNeg)} />
            </StatRow>
          </Panel>
        )}
        <div className="ac-form-row" style={{ alignItems: 'stretch' }}>
          <Panel title={`Savings decomposition (Y${r.horizon})`}>
            <div style={{ lineHeight: 'var(--ac-leading-code)' }}>
              <b style={{ color: 'var(--ac-teal)' }}>{fmtEur(B.grossAuto)}</b> gross automation<br />
              <b style={{ color: 'var(--ac-brick)' }}>−{fmtEur(B.agentCost)}</b> agent operating cost<br />
              <b style={{ color: 'var(--ac-amber)' }}>{B.relocation >= 0 ? '+' : ''}{fmtEur(B.relocation)}</b> relocation<br />
              <b style={{ color: 'var(--ac-blue)' }}>= {fmtEur(B.total)} total savings / yr</b>
            </div>
          </Panel>
          <Panel title={`Team shift (Y${r.horizon})`}>
            <div style={{ lineHeight: 'var(--ac-leading-code)' }}>
              <strong>{r.team.asis.toFixed(1)}</strong> AS-IS human FTE →<br />
              <b style={{ color: 'var(--ac-blue)' }}>{r.team.human.toFixed(1)}</b> residual human FTE + <b style={{ color: 'var(--ac-info-700)' }}>{r.team.agent.toFixed(1)}</b> agent vFTE<br />
              <span className="ac-muted">Product status: {r.status}</span>
            </div>
          </Panel>
        </div>
        <p className="ac-muted">All figures recomputed live from the calculation core (deterministic) and the last Monte Carlo run (probabilistic). Estimates to validate with client teams.</p>
      </>} />
  );
}
