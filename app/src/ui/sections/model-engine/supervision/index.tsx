import { enableSup, setSupMode, setSupProvision, setSupRampCap, setSupRampRate, setSupervisorCost, setSupervisors } from '@/controllers/modelSupervision';
import { supModel } from '@/domain/model/supView';
import { useCtx } from '@/store/hooks';
import { ChoiceField, NumField } from '@/ui/widgets/CommitField';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { PhaseSwitch } from '../shared';
import { CapacityTable } from './CapacityTable';
import { DoraTable } from './DoraTable';

const help = (
  <>
    <p>Supervision capacity is a decision variable with a cost, not a free assumption or a hard wall. <strong>Provisioned</strong> solves for the supervisors the target agent capacity needs and prices them (the app&apos;s existing hybrid run-team formula, named and surfaced);
      the optional day-rate override replaces the blended rate. <strong>Constrained</strong> fixes the headcount and caps achievable agent vFTE at
        what that team can absorb (the inverse of the same formula; hard = min(), soft = smooth saturation); what supervision cannot absorb stays with
        the human team.</p>
    <p>S(t) = S0·(1+λ)^t, capped at a ceiling multiple (default 2.5×). The DORA read-out is a pure read-out of P1/P3 state: enter a measured value beside a derived one — a gap is a calibration signal, not a failure.</p>
  </>
);

/** P3 — supervision provisioned or constrained: headcount, cap mode, ramp, per-year capacity table and the DORA read-out. */
export default function ModelSupervisionSection() {
  const c = useCtx(), sup = c.s.MODEL.SUP, on = !!c.s.MODEL.FLAGS.sup, constrained = sup.provision === 'constrained', sm = supModel(c);
  return (
    <SectionFrame title="🧑‍✈️ Supervision — provisioned or constrained · P3 · v16.7" help={help}
      input={<>
        <Callout>Prices supervision as a <strong>decision, not a wall</strong>. <strong>Provisioned</strong> (default) solves for the supervisor
          headcount your target agent capacity needs, prices it, and never caps throughput — this is the app&apos;s pre-existing run-team sizing
          policy, now named and surfaced.
          <strong> Constrained</strong> fixes headcount and caps achievable capacity at what that team can absorb — the &quot;what today&apos;s team can absorb without hiring&quot; sensitivity. Plus a DORA read-out pulled forward from P5. (AME-SPEC v0.2, P3)</Callout>
        <div className="ac-form-row">
          <PhaseSwitch on={on} phase="P3" onToggle={() => enableSup(!on)} />
          <ChoiceField label="Mode" value={constrained ? 'constrained' : 'provisioned'} onChange={setSupProvision} options={[{ value: 'provisioned', label: 'Provisioned' }, { value: 'constrained', label: 'Constrained' }]} />
          {constrained && <>
            <NumField label="Supervisors (FTE)" value={sup.supervisors} min={0} max={500} step={0.5} width={90} onCommit={setSupervisors} />
            <ChoiceField label="Cap sub-mode" value={sup.mode === 'soft' ? 'soft' : 'hard'} onChange={setSupMode} options={[{ value: 'hard', label: 'Hard (min)' }, { value: 'soft', label: 'Soft (saturating)' }]} />
            <NumField label="Ramp λ (/yr)" value={sup.rampRate} min={0} max={0.5} step={0.05} width={74} onCommit={setSupRampRate} />
            <NumField label="Ramp cap (×)" value={sup.rampCap} min={1} max={4} step={0.1} width={74} onCommit={setSupRampCap} />
          </>}
          {!constrained && <NumField label="Day-rate override (€, 0=use blended)" value={sup.supervisorCost} min={0} max={400000} step={10} width={120} onCommit={setSupervisorCost} />}
        </div>
        {constrained && sm.supervisorsToUnlock > 0 && <p className="ac-warn-ink">+{sm.supervisorsToUnlock} supervisor(s) would unlock the unconstrained case at Y3 — the bridge back to Provisioned.</p>}
        <Callout>{on ? <>Phase <strong>ON — {constrained ? 'Constrained' : 'Provisioned'}</strong>. {constrained
          ? <>Achievable agent capacity is capped at what {sup.supervisors} supervisor(s) can absorb; the shortfall stays with the residual human team (effort conservation holds).</>
          : <>Supervisor headcount is solved from agent capacity and priced as a cost line; throughput is never capped. This is the pre-existing default policy, now named and surfaced.</>}</>
          : <>Phase <strong>OFF</strong> — behaves exactly like the pre-existing run-team sizing policy (Provisioned, unlabelled).</>}</Callout>
      </>}
      result={<><CapacityTable constrained={constrained} /><DoraTable /></>} />
  );
}
