import { setInput } from '@/controllers/inputs';
import { useDoc } from '@/store/hooks';
import { Field, SelectInput } from '@/ui/widgets/fields';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import '../scope-tools.css';
import { Editor } from './Editor';

const HORIZONS = [['1', '1 year — rapid pilot'], ['2', '2 years — BU transformation'], ['3', '3 years — standard'], ['5', '5 years — strategic'], ['7', '7 years — portfolio'], ['10', '10 years — operating model']];

const help = (
  <>
    <p>Sets <strong>when</strong> the automation lands: the three-year adoption ramp (Year 1 → Year 3) is the fraction of the automation potential actually captured each year. Realized automation(t) = effective depth × adoption ramp(t);
      the ramp can never push past the depth.</p>
    <p>The curve is a free-form spline through draggable control points (or a logistic / Gompertz fitted through them). It is sampled at months 12/24/36 into the Y1/Y2/Y3 ramp anchors, so the whole case follows.
      The horizon and the start date scale the curve, the timeline and the Gantt.</p>
  </>
);

function Timing() {
  const start = useDoc((d) => d.dom.values.rmStart ?? '');
  return (
    <Panel title="🗓️ Transformation timing">
      <p className="ac-muted">The horizon and the calendar start of the transformation. These scale the adoption curve below, the whole timeline and the 📅 Gantt. The client-facing onboarding stages (Discover → Calibrate → Validate → Pilot &amp; Prove) now live in 🤝 Engage.</p>
      <div className="ac-form-row">
        <SelectInput id="horizon" label="Horizon (years)" options={HORIZONS.map(([value, label]) => ({ value: value as string, label: label as string }))} />
        <Field label="Start date"><input type="date" value={start} onChange={(e) => setInput('rmStart', e.target.value)} /></Field>
      </div>
    </Panel>
  );
}

/** S-curve — adoption ramp: horizon, start date and the draggable adoption curve with its maturity levels. */
export default function ScurveSection() {
  return <SectionFrame title="📊 S-curve — adoption ramp" help={help} input={<Timing />} result={<Editor />} />;
}
