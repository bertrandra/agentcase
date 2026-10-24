import { capability, pilotSizing } from '@/domain/tune';
import { useCtx } from '@/store/hooks';
import { Badge, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { NumberInput } from '@/ui/widgets/fields';
import { Meter, Note, fmtK } from '@/ui/widgets/tuneA';

/** EV-21 pilot sizing: pod size, break-in sprints and prove weeks give the duration and an indicative cost. */
export function PilotCard() {
  const p = pilotSizing(useCtx());
  return (
    <Panel title="Pilot sizing — pilot as product" aside={<Badge tone="blue">EV-21</Badge>}>
      <div className="ac-form-row">
        <NumberInput id="pilotFte" label="Pilot pod size (FTE)" min={1} max={8} step={1} />
        <NumberInput id="pilotBreakin" label="Break-in sprints" min={0} max={6} step={1} />
        <NumberInput id="pilotWeeks" label="Prove weeks" min={4} max={26} step={1} />
      </div>
      <StatRow>
        <Stat label="Pilot duration" value={`${p.totalWeeks} wk`} tone="teal" />
        <Stat label="Pilot cost (indicative)" value={fmtK(p.cost)} tone="teal" />
        <Stat label="Structure" value="DEC → HOW → BLD" tone="teal" />
      </StatRow>
      <p>The pilot delivers a <strong>factory</strong> (the frozen harness + agents), not just an app: {p.breakIn} break-in sprint(s) to stabilise the harness, then {p.weeks} weeks proving milestones by demonstration, on 3-day fail-fast iterations with full regeneration allowed.</p>
      <Note>Reference 4.1: pilot-as-product; ~88% of pilots never industrialise, so distribution &amp; governance are designed from day one (see the risk register). CC-PILOT-01.</Note>
    </Panel>
  );
}

/** EV-22 internal capability build (Volet A): operational now / in training / target mass. */
export function CapCard() {
  const k = capability(useCtx());
  const rows = [['Operational now', 'capOps', k.ops, k.bars.ops, 'var(--ac-teal-700)'], ['In training', 'capTrain', k.training, k.bars.training, 'var(--ac-warning-600)'], ['Target mass', 'capTarget', k.target, k.bars.target, 'var(--ac-primary-700)']] as const;
  return (
    <Panel title="Internal capability build — Volet A" aside={<Badge tone="blue">EV-22</Badge>}>
      <div className="ac-form-row">
        <NumberInput id="capOps" label="Operational now" min={0} step={10} />
        <NumberInput id="capTrain" label="In training" min={0} step={10} />
        <NumberInput id="capTarget" label="Target mass" min={0} step={10} />
      </div>
      <table className="ac-table">
        <tbody>
          {rows.map(([label, id, v, w, color]) => <tr key={id}><td>{label}</td><td style={{ width: '60%' }}><Meter pct={w} color={color} label={`${label} (share of target mass)`} /></td><td className="ac-c"><strong>{v}</strong></td></tr>)}
        </tbody>
      </table>
      <p>Internal transformation (Volet A, distinct from the client engagement Volet B): <strong>{k.pct}%</strong> of the target mass is operational. The champion + preceptor network (see coaching curve) carries the ramp; time-to-mass is driven by preceptor ratio and training throughput.</p>
      <Note>Reference 4.3: capacity milestones (illustratively 50 operational → 200 in training → 500 targeted). CC-CAP-01.</Note>
    </Panel>
  );
}
