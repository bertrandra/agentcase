import { capability, pilotSizing } from '@/domain/tune';
import { useCtx } from '@/store/hooks';
import { Badge, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { ActivityRefs } from '@/ui/widgets/ActivityRefs';

import { Meter, Note, fmtK } from '@/ui/widgets/tuneA';

/**
 * EV-21 pilot sizing: the duration and indicative cost of the pilot. The pilot is a programme activity (SPEC_BPMN § 19.7, phase B9a): its
 * description and parameters (pod size, break-in sprints, prove weeks) are in the Process section, referenced here.
 */
export function PilotCard() {
  const p = pilotSizing(useCtx());
  return (
    <Panel title="Pilot sizing — pilot as product" aside={<Badge tone="blue">EV-21</Badge>}>
      <ActivityRefs kinds={['pilot']} />
      <StatRow>
        <Stat label="Pilot duration" value={`${p.totalWeeks} wk`} tone="teal" />
        <Stat label="Pilot cost (indicative)" value={fmtK(p.cost)} tone="teal" />
        <Stat label="Structure" value="DEC → HOW → BLD" tone="teal" />
      </StatRow>
      <Note>Reference 4.1: pilot-as-product; ~88% of pilots never industrialise, so distribution &amp; governance are designed from day one (see the risk
        register). CC-PILOT-01.</Note>
    </Panel>
  );
}

/**
 * EV-22 internal capability build (Volet A): operational now / in training / target mass. The capability build is part of the programme's
 * training activity (its numbers edited in the Process section) with the milestone "Target capability reached" (SPEC_BPMN § 19.2, B9a).
 */
export function CapCard() {
  const k = capability(useCtx());
  const rows = [
    ['Operational now', 'capOps', k.ops, k.bars.ops, 'var(--ac-teal-700)'], ['In training', 'capTrain', k.training, k.bars.training, 'var(--ac-warning-600)'],
    ['Target mass', 'capTarget', k.target, k.bars.target, 'var(--ac-primary-700)'],
  ] as const;
  return (
    <Panel title="Internal capability build — Volet A" aside={<Badge tone="blue">EV-22</Badge>}>
      <ActivityRefs kinds={['setupTraining', 'capabilityTarget']} />
      <table className="ac-table">
        <tbody>
          {rows.map(([label, id, v, w, color]) => (
            <tr key={id}>
              <td>{label}</td><td className="ac-cap-meter"><Meter pct={w} color={color} label={`${label} (share of target mass)`} /></td>
              <td className="ac-c"><strong>{v}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Internal transformation (Volet A, distinct from the client engagement Volet B): <strong>{k.pct}%</strong> of the target mass is operational. The
        champion + preceptor network (see coaching curve) carries the ramp; time-to-mass is driven by preceptor ratio and training throughput.</p>
      <Note>Reference 4.3: capacity milestones (illustratively 50 operational → 200 in training → 500 targeted). CC-CAP-01.</Note>
    </Panel>
  );
}
