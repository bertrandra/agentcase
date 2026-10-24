import { onboardingBand } from '@/domain/frame';
import { useCtx } from '@/store/hooks';
import { Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { CheckInput, NumberInput } from '@/ui/widgets/fields';

/** The four consecutive client-facing stages (weeks) and what they add up to on the calendar. */
export function Durations() {
  const b = onboardingBand(useCtx());
  return (
    <Panel title="⏱️ Onboarding stage durations">
      <p className="ac-muted">How long each client-facing stage runs, in weeks. They are consecutive: the transformation start date (set in 📊 S-curve) plus
        these four stages gives the date the scale-out decision is taken.</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end' }}>
        <NumberInput id="rmD1" label="Discover (wk)" min={1} max={26} />
        <NumberInput id="rmD2" label="Calibrate (wk)" min={1} max={26} />
        <NumberInput id="rmD3" label="Validate (wk)" min={1} max={26} />
        <NumberInput id="rmD4" label="Pilot & Prove (wk)" min={1} max={52} />
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
