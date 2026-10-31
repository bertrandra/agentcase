import { AUTONOMY_TIERS, coachView, sddView } from '@/domain/tune';
import { useCtx } from '@/store/hooks';
import { Badge, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { ActivityRefs } from '@/ui/widgets/ActivityRefs';
import { RangeInput } from '@/ui/widgets/fields';
import { Note, fmtK } from '@/ui/widgets/tuneA';

/** EV-16 SDD & tooling maturity: the spec-driven level cuts the verification tax (up to −50 % at 100). */
export function SddPanel() {
  const s = sddView(useCtx());
  return (
    <Panel title="SDD & tooling maturity" aside={<Badge tone="blue">EV-16</Badge>}>
      <div className="ac-form-row">
        <RangeInput id="sddMat" label="SDD maturity (0–100)" step={5} unit="" />
        <RangeInput id="harnessMat" label="Agent-stack / harness readiness (0–100)" step={5} unit="" />
      </div>
      <StatRow>
        <Stat label="SDD maturity" value={`${s.sdd}/100 · ${s.name}`} tone="teal" />
        <Stat label="Verification-tax reduction" value={`−${s.taxCut}%`} tone="teal" />
        <Stat label="Harness readiness" value={`${s.harness}/100`} tone="blue" />
      </StatRow>
      <p>{s.text}</p>
      <Note>Reference 2.1: Spec-Driven Development makes the spec the primary executable artifact. Higher SDD maturity cuts the verification tax (up
        to −50% at 100) and mitigates the AI code-quality premium (EV-23). Harness readiness (AGENTS.md, GUARDRAILS.md, skills, hooks, MCP) is the
        tooling foundation. CC-SDD-01.</Note>
    </Panel>
  );
}

/**
 * EV-19 coaching curve & autonomy weaning. The coaching load (Y1, cruise) is a parameter of the coaching activity of
 * the transformation programme, edited in the Process section (SPEC_BPMN § 19.7, phase B9a); this panel shows the curve it gives.
 */
export function CoachPanel() {
  const k = coachView(useCtx());
  return (
    <Panel title="Coaching curve & autonomy weaning" aside={<Badge tone="blue">EV-19</Badge>}>
      <ActivityRefs kinds={['setupCoaching']} />
      <StatRow>
        {k.loads.map((p, i) => <Stat key={i} label={`Y${i + 1} coaching load`} value={`${Math.round(p)}%`} hint={`≈ ${fmtK(k.costs[i] as number)}/yr`}
          tone="blue" />)}
      </StatRow>
      <p className="ac-muted">{k.costs.map((x, i) => `Y${i + 1} ≈ ${fmtK(x)}/yr`).join(' · ')}</p>
      <table className="ac-table">
        <thead><tr><th>Autonomy tier</th><th className="ac-c">Phase</th><th>Mechanism</th></tr></thead>
        <tbody>{AUTONOMY_TIERS.map(([t, ph, m]) => <tr key={t}><td><strong>{t}</strong></td><td className="ac-c">{ph}</td><td>{m}</td></tr>)}</tbody>
      </table>
      <Note>Reference 3.2/4.2: coaching starts at ~{k.y1}% of capacity and decays to ~{k.cruise}% at cruise as support is weaned (intensive → on-demand →
        self-service → community). The coaching activity of the programme prices this curve: its cost is in the euro result, in the setup (D-B30).
        CC-COACH-01.</Note>
    </Panel>
  );
}
