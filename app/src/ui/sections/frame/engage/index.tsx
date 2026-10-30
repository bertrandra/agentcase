import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Durations } from './Durations';
import { Roadmap } from './Roadmap';
import { Tracker } from './Tracker';

const help = (
  <>
    <p>Shows the runway of the four onboarding stages run <strong>with the client</strong> before the agentic build scales: Discover → Calibrate → Validate →
      Pilot &amp; Prove. Each ends on an explicit gate, so commitment grows only as evidence does. Their durations (edited in the 🧩 Process section, where the
      stages are activities of the transformation programme) position everything downstream on the calendar
      — the roadmap below, the 📅 Gantt, and the point at which the adoption ramp is allowed to start climbing.</p>
    <p>The stages are consecutive, not parallel: <code>onboarding end</code> = start date + Discover + Calibrate + Validate + Pilot. At the defaults (4 + 4 + 4
      + 6) that is 18 weeks. Shortening them moves the date benefits start, which flatters payback and NPV — resist it without cause, especially the Pilot,
      which turns the most contested numbers into measurements.</p>
    <p>The tracker records actual adoption, FTE and savings per quarter against the modelled plan; it is collapsed by default.</p>
  </>
);

/** Engage — the client onboarding runway: stage durations, the gated roadmap and the plan-vs-actual tracker. */
export default function EngageSection() {
  return (
    <SectionFrame title="🤝 Engage — starting early with the client" help={help}
      input={<><p className="ac-muted">Engage early, commit progressively. The runway below is the time you spend alongside the client before scaling; its
        stages are activities of the transformation programme, described and timed in the 🧩 Process section. Measurement precedes commitment — nothing
        scales until the pilot clears its gate.</p><Durations /></>}
      result={<><Roadmap /><Tracker /></>} />
  );
}
