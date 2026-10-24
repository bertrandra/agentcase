import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Badge, Panel } from '@/ui/widgets/cards';
import '../scope-tools.css';
import { Cascade } from './Cascade';
import { Controls } from './Controls';
import { StatusTable } from './StatusTable';

const help = (
  <>
    <p>A greenfield build and a legacy system in maintenance do not spend their effort in the same places. The lifecycle position (0–100) re-weights the effort
      of every SDLC phase
      (artefact weight = raw effort × lifecycle weight) and sets how automatable the resulting mix is (a global automation posture on the effective depth).</p>
    <p>The position interpolates linearly between the two nearest statuses, so 37/100 is a genuine blend. Untick the switch and every weight and the posture
      return to ×1.00.</p>
  </>
);

/** Product status lifecycle weighting — where the product sits on its lifecycle re-weights each phase's effort and the automation posture. */
export default function LcWeightingSection() {
  return (
    <SectionFrame title="📊 Product status lifecycle weighting" help={help}
      input={<Panel title="Product status lifecycle weighting" aside={<Badge tone="blue">= product profile (EV-13) · v14.8</Badge>}><Controls /></Panel>}
      result={<><Cascade /><StatusTable /></>} />
  );
}
