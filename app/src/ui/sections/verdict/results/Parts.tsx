import type { ReactNode } from 'react';
import { pNegTone } from '@/domain/stress';
import { VERDICT_META, type Decision, type SavingsYear, type TeamShift } from '@/domain/verdict';
import { Panel, StatRow } from '@/ui/widgets/cards';
import { fmtEur } from '../../stress/fmt';
import { Kpi } from './Kpi';

/** The blocks shared by the single-product Results and its Portfolio / Wave view: same markup, the figures come from the caller. */

/** Invitation to run the simulation before any probabilistic verdict is shown. */
export function NotComputed({ what, run }: { what: string; run: ReactNode }) {
  return (
    <div className="ac-callout ac-callout-pending">
      {what} not yet computed — {run} to add the confidence-conditional recommendation.
      The figures below are the deterministic view.
    </div>
  );
}

/** The verdict box: label, confidence, downside P10 and median P50. */
export function VerdictBox({ d }: { d: Decision }) {
  const meta = VERDICT_META[d.verdict];
  return (
    <div className="ac-verdict ac-verdict-compact" data-tone={meta.tone} data-bg-tone={meta.bgTone}>
      <div className="ac-verdict-label">{meta.icon} {meta.label}</div>
      <div><strong className="ac-verdict-pct">{d.confidence}%</strong> confidence · downside P10 <strong>{fmtEur(d.stats.p10)}</strong> · median
        P50 <strong>{fmtEur(d.stats.p50)}</strong></div>
    </div>
  );
}

/** The uncertainty band of a Monte Carlo run. */
export function UncertaintyPanel({ title, s }: { title: string; s: { p10: number; p50: number; p90: number; pNetNeg: number } }) {
  return (
    <Panel title={title}>
      <StatRow>
        <Kpi label="P10 downside" value={fmtEur(s.p10)} tone={s.p10 < 0 ? 'brick' : 'teal'} /><Kpi label="P50 median" value={fmtEur(s.p50)} tone="blue" />
        <Kpi label="P90 upside" value={fmtEur(s.p90)} tone="teal" />
        <Kpi label="P(net < 0)" value={`${Math.round(s.pNetNeg * 100)}%`} tone={pNegTone(s.pNetNeg)} />
      </StatRow>
    </Panel>
  );
}

/**
 * Where the savings come from (one year) and the human to agent team shift, side by side. The lines add up to the Time-Engine savings of the year
 * (`b.model`, the figure of Annual / Financial / Story); `extra` is a last line under the team shift.
 */
export function SavingsAndTeam({ savingsTitle, teamTitle, b, team, extra }: {
  savingsTitle: string; teamTitle: string; extra?: ReactNode; b: SavingsYear; team: TeamShift;
}) {
  return (
    <div className="ac-form-row ac-stretch">
      <Panel title={savingsTitle}>
        <div className="ac-lines">
          <b data-ink="teal">{fmtEur(b.grossAuto)}</b> gross automation<br />
          <b data-ink="brick">−{fmtEur(b.agentCost)}</b> agent operating cost<br />
          <b data-ink="amber">{b.relocation >= 0 ? '+' : ''}{fmtEur(b.relocation)}</b> relocation<br />
          <span className="ac-muted">= {fmtEur(b.total)} at the year-end team</span><br />
          <b>{b.other >= 0 ? '+' : ''}{fmtEur(b.other)}</b> within-year ramp and engine effects<br />
          <b data-ink="blue">= {fmtEur(b.model)} total savings / yr</b>
        </div>
      </Panel>
      <Panel title={teamTitle}>
        <div className="ac-lines">
          <strong>{team.asis.toFixed(1)}</strong> AS-IS human FTE →<br />
          <b data-ink="blue">{team.human.toFixed(1)}</b> residual human FTE + <b data-ink="info">{team.agent.toFixed(1)}</b> agent vFTE<br />
          <span className="ac-muted">residual = {team.delivery.toFixed(1)} delivery team + {team.runTeam.toFixed(1)} agentic run team</span>
          {extra && <><br />{extra}</>}
        </div>
      </Panel>
    </div>
  );
}
