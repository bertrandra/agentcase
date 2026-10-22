/** @calc-zone scope-automation */
import { PHASES, SDLC_ARTEFACTS, makeCtx, phasesForScope, regOfActiveNorms as regOf } from '@/domain';
import { current } from 'immer';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

/** Regulatory artefacts of a phase whose norm is ticked (regardless of individual selection). */
const regOfActiveNorms = (d: Doc, phase: string) => regOf(makeCtx(current(d) as Doc), phase);
const sdlcOf = (phase: string) => SDLC_ARTEFACTS.filter((a) => a.phase === phase);

const add = (arr: string[], id: string) => { if (!arr.includes(id)) arr.push(id); };
const del = (arr: string[], id: string) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); };

const toggleArtefactCmd = defineCommand<{ id: string; on: boolean }>({
  type: 'scope.toggleArtefact', label: (p) => `${p.on ? 'Add' : 'Remove'} ${p.id} ${p.on ? 'to' : 'from'} the scope`,
  run(d, p) {
    if (p.on) add(d.selectedArtefacts, p.id); else del(d.selectedArtefacts, p.id);
    if (d.selectedArtefacts.length === 0) add(d.selectedArtefacts, p.id);   // never empty
    refitPotential(d);
  },
});

const setPhase = (d: Doc, phase: string, on: boolean) => {
  const off = (d.phaseOff ??= []);
  if (on) {
    del(off, phase);
    sdlcOf(phase).forEach((a) => add(d.selectedArtefacts, a.id));
    regOfActiveNorms(d, phase).forEach((a) => add(d.selectedRegArtefacts, a.id));
  } else {
    add(off, phase);
    sdlcOf(phase).forEach((a) => del(d.selectedArtefacts, a.id));
    regOfActiveNorms(d, phase).forEach((a) => del(d.selectedRegArtefacts, a.id));
  }
};
const togglePhaseCmd = defineCommand<{ phase: string; on: boolean }>({
  type: 'scope.togglePhase', label: (p) => `${p.on ? 'Include' : 'Exclude'} phase ${p.phase}`,
  run(d, p) {
    setPhase(d, p.phase, p.on);
    if (d.selectedArtefacts.length === 0 && d.selectedRegArtefacts.length === 0) setPhase(d, p.phase, true);   // never an empty scope
    refitPotential(d);
  },
});

const toggleRegCmd = defineCommand<{ id: string; on: boolean }>({
  type: 'scope.toggleRegArtefact', label: (p) => `${p.on ? 'Add' : 'Remove'} regulatory artefact ${p.id}`,
  run(d, p) { if (p.on) add(d.selectedRegArtefacts, p.id); else del(d.selectedRegArtefacts, p.id); refitPotential(d); },
});
const selectAllCmd = defineCommand<{ on: boolean }>({
  type: 'scope.selectAll', label: (p) => (p.on ? 'Select the whole scope' : 'Clear the scope (keep the first phase)'),
  run(d, p) {
    const ids = phasesForScope().map((x) => x.id);
    if (p.on) {
      d.phaseOff = [];
      d.selectedArtefacts = SDLC_ARTEFACTS.map((a) => a.id);
      ids.forEach((id) => regOfActiveNorms(d, id).forEach((a) => add(d.selectedRegArtefacts, a.id)));
    } else {
      const keep = PHASES[0]!.id;
      d.phaseOff = ids.filter((id) => id !== keep);
      d.selectedArtefacts = sdlcOf(keep).map((a) => a.id);
      const keepReg = new Set(regOfActiveNorms(d, keep).map((a) => a.id));
      d.selectedRegArtefacts = d.selectedRegArtefacts.filter((id) => keepReg.has(id));
    }
    refitPotential(d);
  },
});
const setSeqCmd = defineCommand<{ kind: 'phase' | 'artefact'; id: string; value: number | null }>({
  type: 'scope.setSeq', label: (p) => `Set ramp-up sequence of ${p.id}`, coalesceKey: (p) => `scope.setSeq:${p.id}`,
  run(d, p) {
    if (p.kind === 'phase') { const l = (d.phaseSeq ??= []) as { id: string; seq: number | null }[]; const e = l.find((x) => x.id === p.id); if (e) e.seq = p.value; else l.push({ id: p.id, seq: p.value }); return; }
    const list = p.id.startsWith('R') ? d.regArtefactsEdited : d.artefactsEdited, e = list.find((x) => x.id === p.id);
    if (e) e.seq = p.value ?? undefined;
  },
});

export const toggleRegArtefact = (id: string, on: boolean): void => appStore().dispatch(toggleRegCmd({ id, on }));
export const selectAllPhases = (on: boolean): void => appStore().dispatch(selectAllCmd({ on }));
export const setSeq = (kind: 'phase' | 'artefact', id: string, value: number | null): void => appStore().dispatch(setSeqCmd({ kind, id, value }));
export const toggleArtefact = (id: string, on: boolean): void => appStore().dispatch(toggleArtefactCmd({ id, on }));
export const togglePhase = (phase: string, on: boolean): void => {
  if (PHASES.some((p) => p.id === phase) || phase === 'Cross-cutting') appStore().dispatch(togglePhaseCmd({ phase, on }));
};
