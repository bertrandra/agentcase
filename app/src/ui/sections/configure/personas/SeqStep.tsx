import { useState } from 'react';
import { addSeqSection, moveSeqSection, moveSeqStep, removeSeqSection, removeSeqStep, setSeqStepLabel } from '@/controllers/navSequence';
import { groupsByOrder, type NavSection } from '@/domain/nav/layout';
import type { MenuGroup } from '@/domain/pdc/personas';

interface Props { persona: string; si: number; count: number; step: { label: string; sections: string[] }; sections: NavSection[]; groups: MenuGroup[] }

/** One step of a guided sequence: label, the sections in walking order (drag or ← →, ✕ removes) and a picker grouped like the menu. */
export function SeqStep({ persona, si, count, step, sections, groups }: Props) {
  const [drag, setDrag] = useState<string | null>(null), name = (id: string) => sections.find((s) => s.id === id)?.label ?? id;
  const drop = (target: string | null) => {
    const id = drag; setDrag(null);
    if (!id || id === target) return;
    const rest = step.sections.filter((x) => x !== id), at = target ? rest.indexOf(target) : -1;
    moveSeqSection(persona, si, id, at < 0 ? rest.length : at);
  };
  return (
    <fieldset className="ac-seq-step" aria-label={`Step ${si + 1}`}>
      <div className="ac-form-row">
        <input type="text" aria-label={`Label of step ${si + 1}`} placeholder="Step label" className="ac-seq-step-label" value={step.label}
          onChange={(e) => setSeqStepLabel(persona, si, e.target.value)} />
        <button type="button" className="ac-btn" disabled={si === 0} aria-label={`Move step ${si + 1} up`}
          onClick={() => moveSeqStep(persona, si, -1)}>↑</button>
        <button type="button" className="ac-btn" disabled={si === count - 1} aria-label={`Move step ${si + 1} down`}
          onClick={() => moveSeqStep(persona, si, 1)}>↓</button>
        <button type="button" className="ac-btn" aria-label={`Remove step ${si + 1}`} onClick={() => removeSeqStep(persona, si)}>✕ Step</button>
      </div>
      <ul aria-label={`Sections of step ${si + 1}`} className="ac-seq-step-list" onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); drop(null); }}>
        {step.sections.length === 0 && <li className="ac-muted">No sections yet — add one below</li>}
        {step.sections.map((id, i) => (
          <li key={id} draggable className="ac-seq-step-chip"
            onDragStart={(e) => { setDrag(id); e.dataTransfer?.setData('text/plain', id); }} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(id); }}>
            ⠿ {name(id)}
            <button type="button" className="ac-btn" disabled={i === 0} aria-label={`Move ${name(id)} earlier in step ${si + 1}`}
              onClick={() => moveSeqSection(persona, si, id, i - 1)}>←</button>
            <button type="button" className="ac-btn" disabled={i === step.sections.length - 1} aria-label={`Move ${name(id)} later in step ${si + 1}`}
              onClick={() => moveSeqSection(persona, si, id, i + 1)}>→</button>
            <button type="button" className="ac-btn" aria-label={`Remove ${name(id)} from step ${si + 1}`}
              onClick={() => removeSeqSection(persona, si, id)}>✕</button>
          </li>
        ))}
      </ul>
      <select aria-label={`Add a section to step ${si + 1}`} value="" onChange={(e) => e.target.value && addSeqSection(persona, si, e.target.value)}>
        <option value="">+ Add section…</option>
        {groupsByOrder(groups).map((g) => {
          const free = sections.filter((s) => s.group === g.id && !step.sections.includes(s.id));
          return free.length ? <optgroup key={g.id} label={g.label}>{free.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</optgroup> : null;
        })}
      </select>
    </fieldset>
  );
}
