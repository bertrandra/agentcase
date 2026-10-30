import { onboardingBand } from '@/domain/frame';
import { useCtx } from '@/store/hooks';
import { Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { ActivityRefs } from '@/ui/widgets/ActivityRefs';
import { CheckInput } from '@/ui/widgets/fields';

/** The engagement stages are programme activities (SPEC_BPMN § 19.7): this screen shows what they add up to on the calendar and links to them. */
const STAGES = ['stage-discover', 'stage-calibrate', 'stage-validate', 'stage-pilotProve', 'stage-decide'];

/** The runway of the four consecutive client-facing stages on the calendar (the stages themselves are timed in the Process section). */
export function Durations() {
  const b = onboardingBand(useCtx());
  return (
    <Panel title="⏱️ Onboarding stage durations">
      <p className="ac-muted">The stages are consecutive: the transformation start date (set in 📊 S-curve) plus their weeks gives the date the scale-out
        decision is taken.</p>
      <ActivityRefs kinds={STAGES} />
      <div className="ac-durations">
        <CheckInput id="ganttShowOnboarding" label="Display Discover/Calibrate/Validate/Pilot & Prove in Gantt/timeline" />
      </div>
      <StatRow>
        <Stat label="Runway to decision" value={`${b.totalWeeks} wk`} />
        <Stat label="≈ in months" value={`${b.months} mo`} tone="teal" />
        <Stat label="Pilot & Prove starts" value={b.pilotStart} tone="amber" />
        <Stat label="Decide & Scale" value={b.decide} tone="brick" />
      </StatRow>
    </Panel>
  );
}
