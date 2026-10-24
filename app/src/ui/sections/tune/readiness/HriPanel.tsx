import { HRI_GROUPS, hriSummary } from '@/domain/tune';
import { useCtx } from '@/store/hooks';
import { Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { CheckInput, NumberInput, SelectInput } from '@/ui/widgets/fields';
import { CoefInput, Note, fmtK } from '@/ui/widgets/tuneA';

const ANSWERS = [{ value: '0', label: 'No' }, { value: '2', label: 'Partial' }, { value: '4', label: 'Yes' }];

function Questions() {
  return (
    <div>
      {HRI_GROUPS.map((g, gi) => (
        <fieldset key={g.title} className="ac-panel">
          <legend><strong>{g.title}</strong></legend>
          {g.q.map((q, qi) => <SelectInput key={q} id={`hriQ${gi * 3 + qi}`} label={q} options={ANSWERS} />)}
        </fieldset>
      ))}
    </div>
  );
}

function Outcome() {
  const h = hriSummary(useCtx());
  return (
    <div aria-live="polite">
      <StatRow><Stat label="Human readiness index" value={`${h.index}/100 · ${h.label}`} tone={h.index >= 75 ? 'teal' : h.index >= 50 ? 'amber' : 'brick'} /></StatRow>
      <table className="ac-table">
        <tbody>
          <tr><td>Change intensity</td><td className="ac-c"><strong>{h.intensity}</strong></td></tr>
          <tr><td>Change cost ({h.etp.toFixed(1)} AS-IS FTE ×
            €{Math.round(h.costPerFte).toLocaleString('en-US')})</td><td className="ac-c"><strong>{fmtK(h.cost)}</strong></td></tr>
          <tr><td>Adoption drag on the S-curve</td><td className="ac-c"><strong>× {h.drag.toFixed(2)}</strong></td></tr>
          <tr><td>Status in the
            model</td><td className="ac-c"><strong style={{ color: h.on ? 'var(--ac-teal)' : 'var(--ac-muted)' }}>{h.on ? 'APPLIED (setup + ramp)' : 'informative only — enable above'}</strong></td></tr>
        </tbody>
      </table>
      <Note>Referential mapping: leadership, fears, skills, champions/preceptorship, incentives, rituals. Raising the change intensity at low HRI is how the
        model shows the ROI of change itself (CC-HRI-02).</Note>
    </div>
  );
}

/** Human Readiness Index: 18 questions, the resulting change cost and adoption drag, and their coefficients. */
export function HriPanel() {
  return (
    <Panel title="🧑‍🤝‍🧑 Human Readiness Index & change cost">
      <p>The AI Readiness Index above measures the <em>technical &amp; organisational</em> platform. This second index measures
        the <em>human</em> side of the transformation — fears, coaching, champions, preceptorship — following the referential&apos;s people chapter.
        When enabled, it (a) adds a <strong>change cost</strong> line to the Agentic Setup and (b) applies an <strong>adoption drag</strong> to the
        S-curve: ramp × (0.6 + 0.4 × HRI/100).</p>
      <CheckInput id="hriEnabled" label="Enable Human Readiness in the model (change cost + adoption drag)" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
        <Questions />
        <div>
          <Outcome />
          <h3>Change cost per AS-IS FTE (€)</h3>
          <div className="ac-form-row">
            <NumberInput id="hriCostLight" label="Light (HRI ≥ 75)" min={0} step={100} />
            <NumberInput id="hriCostStd" label="Standard (50–74)" min={0} step={100} />
            <NumberInput id="hriCostInt" label="Intensive (< 50)" min={0} step={100} />
          </div>
          <h3>Adoption-drag formula coefficients</h3>
          <div className="ac-form-row">
            <CoefInput coef="hriFloor" id="hriFloorCoef" label="Ramp floor" min={0} max={1} step={0.05} />
            <CoefInput coef="hriSlope" id="hriSlopeCoef" label="Ramp slope" min={0} step={0.05} />
          </div>
          <Note>Drag = floor + slope × HRI/100. A zero-readiness org still realises &quot;floor&quot; of the ramp; &quot;slope&quot; is how much readiness buys
            back. Also editable from the Due-diligence register.</Note>
        </div>
      </div>
    </Panel>
  );
}
