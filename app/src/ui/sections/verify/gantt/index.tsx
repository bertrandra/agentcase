import { caseValues } from '@/domain/process';
import type { Ctx } from '@/domain';
import { ganttView, type GanttView } from '@/domain/verifyB';
import { setInput } from '@/controllers/inputs';
import { equalIgnoring } from '@/store/equal';
import { useCtxSelector, useDoc } from '@/store/hooks';
import { Band } from '@/ui/sections/economics/Band';
import { ActivityRefs } from '@/ui/widgets/ActivityRefs';
import { CheckInput, Field } from '@/ui/widgets/fields';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Delivery } from './Delivery';
import { Program } from './Program';
import { PortfolioGanttPart } from './Waves';
import { PlanTabs } from './plan/PlanTabs';

/** The programme activities the program band draws (their durations are edited in the Process section: SPEC_BPMN § 19.7, phase B9a). */
const ACTIVITIES = ['stage-discover', 'stage-calibrate', 'stage-validate', 'stage-pilotProve', 'build', 'run', 'hubSetup', 'hubRun', 'govGates', 'gate-L2',
  'gate-L3', 'gate-L4'];
const INTRO = 'A planning view of the whole engagement on one timeline: the transformation program (Discover → Calibrate → Validate → Pilot, '
  + 'then Agentic Build ramp and Agentic Run steady state), '
  + 'the SDLC phases in their V-cycle sequence, and every artefact placed in its phase. In-scope items are solid; out-of-scope ones are dimmed. '
  + 'The program bars are activities of the transformation programme: their durations are edited in the Process section (Enter on a bar opens it); '
  + 'the delivery bands are laid out across the case horizon. The WBS, OBS / RAM and Histogram tabs show the programme as a project: derived views '
  + 'of the programme process (a documented mapping, not a standard conversion); its activities are edited in the Process section only.';

/** A number field of the case with a legacy default for when the document does not carry it yet (the legacy Gantt creates these inputs itself). */
interface DomNumberProps { id: string; label: string; fallback: string; min?: number; max?: number; step?: number; hint?: string }
function DomNumber({ id, label, fallback, hint, ...rest }: DomNumberProps) {
  const value = useDoc((d) => caseValues(d)[id] ?? fallback);
  return <Field label={label} hint={hint}><input type="number" value={value} {...rest} onChange={(e) => setInput(id, e.target.value)} /></Field>;
}
function StartDate() {
  const value = useDoc((d) => d.dom.values.rmStart ?? '');
  return <Field label="Roadmap start"><input type="date" value={value} onChange={(e) => setInput('rmStart', e.target.value)} /></Field>;
}

/**
 * Two Gantt views show the same thing when their figures are equal and their calendar axis is the same: the axis carries its month → % functions
 * (fresh per computation), which are fixed by its horizon, months and start.
 */
const figuresEqual = equalIgnoring<GanttView>('axis');
const sameGantt = (a: GanttView, b: GanttView): boolean => figuresEqual(a, b) && a.axis.horizon === b.axis.horizon && a.axis.totalM === b.axis.totalM
  && a.axis.startStr === b.axis.startStr;
const hasCrossOf = (c: Ctx): boolean => ganttView(c).hasCross;

/** The Gantt tab: the transformation program, engine milestones and the seq-grouped delivery rollout on one calendar (the pre-B9d Gantt). */
function GanttTimeline() {
  const v = useCtxSelector(ganttView, sameGantt), gain = v.velocityGain.toFixed(2);
  return (
    <>
      <PortfolioGanttPart />
      <Band items={v.summary} />
      <section className="ac-panel" aria-label="Delivery timeline">
        <h2>Delivery timeline <small className="ac-muted">— one real calendar — transformation program + delivery rollout</small></h2>
        <Program v={v} />
        <Delivery v={v} />
        <p className="ac-muted">One shared calendar, dates from the 🧭 AI Readiness roadmap. <strong>Program</strong> rows run in real time (incl. 🧠
          Knowledge
          Hub build/setup + run when enabled).
          <strong> Delivery rollout</strong> places every in-scope participant — phases <em>and</em> 🔶 Cross-cutting — on the same calendar in ramp-up (seq)
          order, each sized by its own effort weight (w = effort × lifecycle) and compressed as automation ramps — later work is shorter for the same weight
          (velocity ×1 → ×{gain}). <strong>Two participants sharing the same seq number start together</strong> (a synchronised wave);
          otherwise they overlap/pipeline by the % above. This is pipelining — different artefacts sitting in different phases at the same time, not a
          shortcut through the work — so a full pass (spec → … → verify, plus cross-cutting) for the in-scope backlog only actually completes at the 🏁
          marker: <strong>that point is the release</strong>.
          Each row shows the translucent <em>activity</em> span and the solid <em>human-supervision</em> subset. ▶ expand a phase or 🔶 Cross-cutting for its
          SDLC (📄) and regulatory (⚖️) artefacts — the same seq-tie rule applies one level down: artefacts sharing a seq value also start together.</p>
      </section>
    </>
  );
}

/**
 * 📅 Plan (docs/SPEC_BPMN.md § 19.8 F-B78; phase B9d): the Gantt section became the Plan context screen, with the tabs Gantt, WBS, OBS / RAM and
 * Histogram — views of the programme process only; every row opens its activity in the Process section, where activities are edited.
 */
export default function PlanSection() {
  const hasCross = useCtxSelector(hasCrossOf);
  return (
    <SectionFrame title="📅 Plan" help={<p>{INTRO}</p>}
      input={<div className="ac-gantt-inputs">
        <StartDate />
        <CheckInput id="ganttShowOnboarding" label="Show Discover → Pilot in the timeline" />
        <DomNumber id="ganttOverlap" fallback="50" label="Phase overlap (pipelining) %" min={0} max={90} step={5} />
        {hasCross && <DomNumber id="ganttCrossSeq" fallback="0" label="🔶 Cross-cutting seq" step={1} hint="Same number as a phase's seq = same start" />}
        <ActivityRefs kinds={ACTIVITIES} />
      </div>}
      result={<>
        <p className="ac-muted">{INTRO}</p>
        <PlanTabs gantt={<GanttTimeline />} />
      </>} />
  );
}
