import { enableEvt, setEvtAck, setEvtMode, setEvtRDirect, setEvtRSource } from '@/controllers/modelEngine';
import { evtModel } from '@/domain/model/evt';
import { vtaxAvgHuman } from '@/domain/model/vtax';
import { useCtx } from '@/store/hooks';
import { ChoiceField, NumField } from '@/ui/widgets/CommitField';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { PhaseBanner, PhaseSwitch, pct1 } from '../shared';
import { ClassTable } from './ClassTable';

const help = (
  <p>Replaces the flat verification-tax dial of the Eligibility &amp; Abaques tab with one derived from criticality class. Each in-scope artefact&apos;s
    assurance level sets an irreducible independent-review floor φ(C) and a marginal-intensity term κ(C)·(1−r) that shrinks as agent reliability r rises.
    Headline: a structural ROI ceiling ρmax = 1 − φ(C) that no improvement in agent quality can breach. Overlay mode charges the tax on top of supervision;
    Net mode nets out the retained supervision (a negative net tax needs an explicit acknowledgement, CC-VT-02).</p>
);

/** P2 — verification tax derived from criticality class: φ floor, κ intensity, γ stiffness, reliability r and the ceiling ρmax. */
export default function ModelVerificationSection() {
  const c = useCtx(), on = !!c.s.MODEL.FLAGS.evt, e = evtModel(c), evt = c.s.MODEL.EVT, net = evt.mode === 'net';
  const rawNet = e.rate - vtaxAvgHuman(c), vtaxOn = c.inp.c('vtaxApply');
  return (
    <SectionFrame title="🛡️ Verification tax · P2 · v16.6" help={help}
      input={<>
        <Callout>Replaces the flat verification-tax dial (🎯 Eligibility &amp; Abaques tab) with one derived from criticality class: each in-scope
          artefact&apos;s assurance level sets an irreducible independent-review floor <em>φ(C)</em> and a marginal-intensity term <em>κ(C)·(1−r)</em> that
          shrinks as agent reliability <em>r</em> rises. The headline: a structural ROI ceiling <strong>ρmax = 1 − φ(C)</strong> that no improvement in agent
          quality can breach. (AME-SPEC v0.2, P2)</Callout>
        <div className="ac-form-row">
          <PhaseSwitch on={on} phase="P2" onToggle={() => enableEvt(!on)} />
          <ChoiceField
            label="Tax mode"
            value={net ? 'net' : 'overlay'}
            onChange={setEvtMode}
            options={[{ value: 'overlay', label: 'Overlay (on top of supervision)' }, { value: 'net', label: 'Net (of retained supervision)' }]}
          />
          <ChoiceField
            label="Reliability source"
            value={evt.rSource === 'direct' ? 'direct' : 'fromLCE'}
            onChange={setEvtRSource}
            options={[{ value: 'fromLCE', label: 'From P1 (r = p^γ)' }, { value: 'direct', label: 'Direct input' }]}
          />
          {evt.rSource === 'direct' && <NumField
            label="r (direct)"
            value={evt.rDirect.toFixed(2)}
            min={0}
            max={1}
            step={0.05}
            width={74}
            onCommit={setEvtRDirect}
          />}
          <span>φₐ (weighted) <strong>{pct1(e.phiWeighted)}</strong> · rate <strong>{pct1(e.rate)}</strong> · <strong
            data-ink="blue">ρ<sub>max</sub> = {pct1(e.rhoMax)}</strong></span>
        </div>
        {net && rawNet < -1e-9 && (
          <label className="ac-check ac-check-alert"><input
            type="checkbox"
            checked={!!evt.ackNegativeNet}
            onChange={(ev) => setEvtAck(ev.target.checked)}
          /> Net
            tax would be <strong>{(rawNet * 100).toFixed(1)}%</strong> (negative = a savings credit) — I acknowledge this explicit claim
            (CC-VT-02)</label>
        )}
        <PhaseBanner
          on={on}
          off=" — the model uses the legacy flat rate (base × avg. human supervision). The table below previews what P2 would compute from the current scope."
        >
          The verification-tax rate is now derived from each in-scope artefact&apos;s criticality class, not a flat dial.
          {!vtaxOn && <> <strong>Note:</strong> the legacy &quot;Deduct the verification tax from savings&quot;
            checkbox (🎯 Eligibility &amp; Abaques tab) is currently <strong>off</strong>, so this rate is computed but not yet charged to the case.</>}
        </PhaseBanner>
      </>}
      result={<ClassTable on={on} />} />
  );
}
