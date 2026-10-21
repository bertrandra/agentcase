import { Panel } from '@/ui/widgets/cards';

/** Static explanation of the two sizing modes (kept from the legacy section: it is the audit trail of the policy). */
export function HowItWorks() {
  return (
    <Panel title="How it works — and why">
      <p><strong>Hybrid (default):</strong> <code>run FTE(year) = platform floor + agent vFTE(year) × ops load</code>, where the floor = <code>max(floor min, base team × floor %)</code> and applies <em>only while at least one agent is deployed</em>.</p>
      <ul>
        <li><strong>Platform floor</strong> — as soon as one agent runs, a minimal platform exists: prompt/version CI-CD, observability, guardrails, incident response. It does not depend on how many agents run.</li>
        <li><strong>Per-agent ops load</strong> — each deployed agent vFTE adds monitoring, evaluation, cost tracking and maintenance. 0.15 FTE per agent ≈ one run engineer for 6–7 agents: frugal by design, which is precisely the economic argument of agentic delivery.</li>
        <li><strong>At zero automation the cost is zero</strong> — no agents, no platform, no AgentOps, and (in hybrid mode) no agent infrastructure either: the infra line is charged only in years where agents exist. The ROI near 0% automation is therefore honest: only the setup remains at stake.</li>
      </ul>
      <p><strong>Legacy mode</strong> keeps the pre-v12.26 behaviour — a fixed team of <code>max(0.5, base × 10% + 0.5)</code> FTE regardless of automation level — for comparability with earlier business cases. Its known limitation: it charges a full run team (~€244k for a 15-FTE base) even at 0% automation, which distorts the low-automation end of the curve.</p>
      <p className="ac-muted">The run team is priced at the target-location blended day rate × 1.15 (AI-skills premium) × working days, and scaled by the strategy run-team factor where applicable. All three coefficients are consulting benchmarks — validate them against the client's platform maturity and agent portfolio.</p>
    </Panel>
  );
}
