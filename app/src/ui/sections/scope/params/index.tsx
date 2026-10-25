import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Callout } from '@/ui/widgets/cards';
import '../scope-tools.css';
import { AutomationCurve } from './AutomationCurve';
import { CeilingBox } from './CeilingBox';
import { Funnel } from './Funnel';
import { PotentialBox } from './PotentialBox';
import { useAutoBase } from './useAutoBase';

const help = (
  <>
    <p>Two levers set how deep automation can go. The model takes an <strong>automation potential</strong> (fit to your selected scope, or set manually) and
      a <strong>glass ceiling</strong> (derived from the human supervision
      of the artefacts in scope and the regulatory overlay), then cascades them into headcount, cost, ROI, KPIs and compliance.</p>
    <p>Effective automation = potential × posture × context × hub, capped by the compliance headroom 100 × (1 − ceiling) and by the technical cap. With <em>Fit
      to selected scope</em> ticked the potential is the effort-weighted
      automatable average of the artefacts in scope, so the slider is locked: change the scope or the per-artefact % auto instead. The manual override of the
      ceiling exists, but the derived value is the defensible one.</p>
  </>
);

/** Automation & Glass ceiling — the two levers (potential locked by fit-to-scope, ceiling derived), and where the potential goes over time. */
export default function ParamsSection() {
  const base = useAutoBase();
  return (
    <SectionFrame title="🎯 Automation & Glass ceiling" help={help}
      input={
        <>
          <Callout>Two levers set how deep automation can go: the <strong>automation potential</strong> (how much of the in-scope work agents can take on) and
            the <strong>glass ceiling</strong> (the irreducible human share imposed by
            the regulatory &amp; supervision profile). Effective automation = automation potential × (1 − glass ceiling).</Callout>
          <div className="ac-cards"><PotentialBox /><CeilingBox /></div>
        </>
      }
      result={<><AutomationCurve base={base} /><Funnel base={base} /></>} />
  );
}
