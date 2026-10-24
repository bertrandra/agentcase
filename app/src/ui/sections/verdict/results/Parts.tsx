import type { ReactNode } from 'react';
import { pNegTone } from '@/domain/stress';
import { VERDICT_META, type Decision } from '@/domain/verdict';
import { Panel, StatRow } from '@/ui/widgets/cards';
import { fmtEur } from '../../stress/fmt';
import { Kpi } from './Kpi';

/** The blocks shared by the single-product Results and its Portfolio / Wave view: same markup, the figures come from the caller. */

/** Invitation to run the simulation before any probabilistic verdict is shown. */
export function NotComputed({ what, run }: { what: string; run: ReactNode }) {
  return (
    <div className="ac-callout" style={{ borderStyle: 'dashed' }}>
      {what} not yet computed — {run} to add the confidence-conditional recommendation.
      The figures below are the deterministic view.
    </div>
  );
}

/** The verdict box: label, confidence, downside P10 and median P50. */
export function VerdictBox({ d }: { d: Decision }) {
  const meta = VERDICT_META[d.verdict];
  return (
    <div style={{ border: `2px solid var(--ac-${meta.tone})`, background: `var(--ac-${meta.bgTone})`, borderRadius: 'var(--ac-radius-xl)', padding: '12px 16px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ fontSize: 'var(--ac-font-size-2xl)', fontWeight: 'var(--ac-font-weight-bold)', color: `var(--ac-${meta.tone})` }}>{meta.icon} {meta.label}</div>
      <div><strong style={{ color: `var(--ac-${meta.tone})` }}>{d.confidence}%</strong> confidence · downside P10 <strong>{fmtEur(d.stats.p10)}</strong> · median P50 <strong>{fmtEur(d.stats.p50)}</strong></div>
    </div>
  );
}

/** The uncertainty band of a Monte Carlo run. */
export function UncertaintyPanel({ title, s }: { title: string; s: { p10: number; p50: number; p90: number; pNetNeg: number } }) {
  return (
    <Panel title={title}>
      <StatRow>
        <Kpi label="P10 downside" value={fmtEur(s.p10)} tone={s.p10 < 0 ? 'brick' : 'teal'} /><Kpi label="P50 median" value={fmtEur(s.p50)} tone="blue" />
        <Kpi label="P90 upside" value={fmtEur(s.p90)} tone="teal" /><Kpi label="P(net < 0)" value={`${Math.round(s.pNetNeg * 100)}%`} tone={pNegTone(s.pNetNeg)} />
      </StatRow>
    </Panel>
  );
}

/** Where the savings come from (one year) and the human to agent team shift, side by side. `extra` is a last line under the team shift. */
export function SavingsAndTeam({ savingsTitle, teamTitle, b, team, extra }: {
  savingsTitle: string; teamTitle: string; extra?: ReactNode;
  b: { grossAuto: number; agentCost: number; relocation: number; total: number }; team: { asis: number; human: number; agent: number };
}) {
  return (
    <div className="ac-form-row" style={{ alignItems: 'stretch' }}>
      <Panel title={savingsTitle}>
        <div style={{ lineHeight: 'var(--ac-leading-code)' }}>
          <b style={{ color: 'var(--ac-teal)' }}>{fmtEur(b.grossAuto)}</b> gross automation<br />
          <b style={{ color: 'var(--ac-brick)' }}>−{fmtEur(b.agentCost)}</b> agent operating cost<br />
          <b style={{ color: 'var(--ac-amber)' }}>{b.relocation >= 0 ? '+' : ''}{fmtEur(b.relocation)}</b> relocation<br />
          <b style={{ color: 'var(--ac-blue)' }}>= {fmtEur(b.total)} total savings / yr</b>
        </div>
      </Panel>
      <Panel title={teamTitle}>
        <div style={{ lineHeight: 'var(--ac-leading-code)' }}>
          <strong>{team.asis.toFixed(1)}</strong> AS-IS human FTE →<br />
          <b style={{ color: 'var(--ac-blue)' }}>{team.human.toFixed(1)}</b> residual human FTE + <b style={{ color: 'var(--ac-info-700)' }}>{team.agent.toFixed(1)}</b> agent vFTE
          {extra && <><br />{extra}</>}
        </div>
      </Panel>
    </div>
  );
}
