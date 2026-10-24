import { ganttView } from '@/domain/verifyB';
import { setInput } from '@/controllers/inputs';
import { useDoc } from '@/store/hooks';
import { Band } from '@/ui/sections/economics/Band';
import { CheckInput, Field, NumberInput } from '@/ui/widgets/fields';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { useView } from '../vbShared';
import { Delivery } from './Delivery';
import { Program } from './Program';
import { PortfolioGanttPart } from './Waves';

const INTRO = 'A planning view of the whole engagement on one timeline: the transformation program (Discover → Calibrate → Validate → Pilot, then Agentic Build ramp and Agentic Run steady state), '
  + 'the SDLC phases in their V-cycle sequence, and every artefact placed in its phase. In-scope items are solid; out-of-scope ones are dimmed. '
  + 'Durations for the program come from the AI Readiness roadmap inputs; the delivery bands are laid out across the case horizon.';

/** A number field of the case with a legacy default for when the document does not carry it yet (the legacy Gantt creates these inputs itself). */
function DomNumber({ id, label, fallback, hint, ...rest }: { id: string; label: string; fallback: string; min?: number; max?: number; step?: number; hint?: string }) {
  const value = useDoc((d) => d.dom.values[id] ?? fallback);
  return <Field label={label} hint={hint}><input type="number" value={value} {...rest} onChange={(e) => setInput(id, e.target.value)} /></Field>;
}
function StartDate() {
  const value = useDoc((d) => d.dom.values.rmStart ?? '');
  return <Field label="Roadmap start"><input type="date" value={value} onChange={(e) => setInput('rmStart', e.target.value)} /></Field>;
}

/** Gantt / timeline: the transformation program, engine milestones and the seq-grouped delivery rollout on one calendar. */
export default function GanttSection() {
  const v = useView(ganttView), gain = v.velocityGain.toFixed(2);
  return (
    <SectionFrame title="📅 Gantt / Timeline" help={<p>{INTRO}</p>}
      input={<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <StartDate />
        {[1, 2, 3, 4].map((i) => <NumberInput key={i} id={`rmD${i}`} label={`${['Discover', 'Calibrate', 'Validate', 'Pilot & Prove'][i - 1]} (weeks)`} min={0} />)}
        <CheckInput id="ganttShowOnboarding" label="Show Discover → Pilot in the timeline" />
        <DomNumber id="ganttOverlap" fallback="50" label="Phase overlap (pipelining) %" min={0} max={90} step={5} />
        {v.hasCross && <DomNumber id="ganttCrossSeq" fallback="0" label="🔶 Cross-cutting seq" step={1} hint="Same number as a phase's seq = same start" />}
      </div>}
      result={<>
        <p className="ac-muted">{INTRO}</p>
        <PortfolioGanttPart />
        <Band items={v.summary} />
        <section className="ac-panel" aria-label="Delivery timeline">
          <h2>Delivery timeline <small className="ac-muted">— one real calendar — transformation program + delivery rollout</small></h2>
          <Program v={v} />
          <Delivery v={v} />
          <p className="ac-muted">One shared calendar, dates from the 🧭 AI Readiness roadmap. <strong>Program</strong> rows run in real time (incl. 🧠
            Knowledge Hub build/setup + run when enabled).
            <strong> Delivery rollout</strong> places every in-scope participant — phases <em>and</em> 🔶 Cross-cutting — on the same calendar in ramp-up (seq)
              order, each sized by its own effort weight (w = effort × lifecycle)
            and compressed as automation ramps — later work is shorter for the same weight (velocity ×1 → ×{gain}). <strong>Two participants sharing the same
              seq number start together</strong> (a synchronised wave);
            otherwise they overlap/pipeline by the % above. This is pipelining — different artefacts sitting in different phases at the same time, not a
              shortcut through the work — so a full pass
            (spec → … → verify, plus cross-cutting) for the in-scope backlog only actually completes at the 🏁 marker: <strong>that point is the
              release</strong>.
            Each row shows the translucent <em>activity</em> span and the solid <em>human-supervision</em> subset. ▶ expand a phase or 🔶 Cross-cutting for its
              SDLC (📄) and regulatory (⚖️) artefacts —
            the same seq-tie rule applies one level down: artefacts sharing a seq value also start together.</p>
        </section>
      </>} />
  );
}
