import type { Persona, PersonaSeq } from '@/domain/pdc/personas';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

/** The persona's guided sequence (created switched off when it has none). Null for an unknown persona. */
function seqOf(d: Doc, id: string): PersonaSeq | null {
  const p = ((d.PERSONAS ?? []) as Persona[]).find((x) => x.id === id);
  return p ? (p.seq ??= { on: false, steps: [] }) : null;
}
type P = { persona: string };
const enabledCmd = defineCommand<P & { on: boolean }>({
  type: 'seq.setEnabled', label: (p) => `${p.on ? 'Enable' : 'Disable'} the guided sequence of ${p.persona}`, run(d, p) { const s = seqOf(d, p.persona); if (s) s.on = p.on; },
});
const addStepCmd = defineCommand<P>({
  type: 'seq.addStep', label: (p) => `Add a step to the sequence of ${p.persona}`, run(d, p) { seqOf(d, p.persona)?.steps.push({ label: 'New step', sections: [] }); },
});
const removeStepCmd = defineCommand<P & { step: number }>({
  type: 'seq.removeStep', label: (p) => `Remove step ${p.step + 1} of the sequence of ${p.persona}`, run(d, p) { seqOf(d, p.persona)?.steps.splice(p.step, 1); },
});
const moveStepCmd = defineCommand<P & { step: number; dir: -1 | 1 }>({
  type: 'seq.moveStep', label: (p) => `Move step ${p.step + 1} of ${p.persona} ${p.dir < 0 ? 'up' : 'down'}`,
  run(d, p) {
    const st = seqOf(d, p.persona)?.steps, to = p.step + p.dir;
    if (st && st[p.step] && st[to]) [st[p.step], st[to]] = [st[to]!, st[p.step]!];
  },
});
const labelCmd = defineCommand<P & { step: number; text: string }>({
  type: 'seq.setStepLabel', label: (p) => `Rename step ${p.step + 1} of ${p.persona} to ${p.text}`, coalesceKey: (p) => `seq.setStepLabel:${p.persona}:${p.step}`,
  run(d, p) { const st = seqOf(d, p.persona)?.steps[p.step]; if (st) st.label = p.text; },
});
const addSectionCmd = defineCommand<P & { step: number; section: string }>({
  type: 'seq.addSection', label: (p) => `Add ${p.section} to step ${p.step + 1} of ${p.persona}`,
  run(d, p) { const st = seqOf(d, p.persona)?.steps[p.step]; if (st && !st.sections.includes(p.section)) st.sections.push(p.section); },
});
const removeSectionCmd = defineCommand<P & { step: number; section: string }>({
  type: 'seq.removeSection', label: (p) => `Remove ${p.section} from step ${p.step + 1} of ${p.persona}`,
  run(d, p) { const st = seqOf(d, p.persona)?.steps[p.step]; if (st) st.sections = st.sections.filter((x) => x !== p.section); },
});
const moveSectionCmd = defineCommand<P & { step: number; section: string; to: number }>({
  type: 'seq.moveSection', label: (p) => `Reorder ${p.section} in step ${p.step + 1} of ${p.persona}`,
  run(d, p) {
    const st = seqOf(d, p.persona)?.steps[p.step], from = st ? st.sections.indexOf(p.section) : -1;
    if (st && from >= 0) { st.sections.splice(from, 1); st.sections.splice(Math.max(0, Math.min(st.sections.length, p.to)), 0, p.section); }
  },
});
const replaceCmd = defineCommand<P & { seq: PersonaSeq }>({
  type: 'seq.replace', label: (p) => `Generate the guided sequence of ${p.persona} (${p.seq.steps.length} steps)`,
  run(d, p) { const x = ((d.PERSONAS ?? []) as Persona[]).find((y) => y.id === p.persona); if (x) x.seq = JSON.parse(JSON.stringify(p.seq)) as PersonaSeq; },
});

const go = <Q>(c: ReturnType<typeof defineCommand<Q>>, p: Q): void => appStore().dispatch(c(p));
export const setSeqEnabled = (persona: string, on: boolean): void => go(enabledCmd, { persona, on });
export const addSeqStep = (persona: string): void => go(addStepCmd, { persona });
export const removeSeqStep = (persona: string, step: number): void => go(removeStepCmd, { persona, step });
export const moveSeqStep = (persona: string, step: number, dir: -1 | 1): void => go(moveStepCmd, { persona, step, dir });
export const setSeqStepLabel = (persona: string, step: number, text: string): void => go(labelCmd, { persona, step, text });
export const addSeqSection = (persona: string, step: number, section: string): void => go(addSectionCmd, { persona, step, section });
export const removeSeqSection = (persona: string, step: number, section: string): void => go(removeSectionCmd, { persona, step, section });
/** Move a section of a step to position `to` of the same step (arrows or drag). */
export const moveSeqSection = (persona: string, step: number, section: string, to: number): void => go(moveSectionCmd, { persona, step, section, to });
/** Replace the whole sequence (Generate from groups). */
export const replaceSeq = (persona: string, seq: PersonaSeq): void => go(replaceCmd, { persona, seq });
