/** @calc-zone scope-automation */
import { PHASES, SDLC_ARTEFACTS, makeCtx, phasesForScope, regOfActiveNorms as regOf } from '@/domain';
import { currentOf } from '@/store/draftValue';
import type { ScopeKeys } from '@/domain/process';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { appStore } from '@/store/instance';
import { editScope } from '@/store/processEdit';
import type { Doc } from '@/store/types';

/**
 * Regulatory artefacts of a phase whose norm is ticked (regardless of individual selection). The scope commands run on the scope keys of the
 * case's process document (`editScope`: the version 2 rules, written back on the document as attribute updates).
 */
const regOfActiveNorms = (d: Doc, phase: string) => regOf(makeCtx(currentOf(d) as Doc), phase);
const sdlcOf = (phase: string) => SDLC_ARTEFACTS.filter((a) => a.phase === phase);

const add = (arr: string[], id: string) => { if (!arr.includes(id)) arr.push(id); };
const del = (arr: string[], id: string) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); };

const toggleArtefactCmd = defineCommand<{ id: string; on: boolean }>({
  type: 'scope.toggleArtefact', label: (p) => `${p.on ? 'Add' : 'Remove'} ${p.id} ${p.on ? 'to' : 'from'} the scope`,
  run(d, p) {
    editScope(d, (k) => {
      if (p.on) add(k.selectedArtefacts, p.id); else del(k.selectedArtefacts, p.id);
      if (k.selectedArtefacts.length === 0) add(k.selectedArtefacts, p.id);   // never empty
    });
    refitPotential(d);
  },
});

const setPhase = (d: Doc, k: ScopeKeys, phase: string, on: boolean) => {
  const off = k.phaseOff;
  if (on) {
    del(off, phase);
    sdlcOf(phase).forEach((a) => add(k.selectedArtefacts, a.id));
    regOfActiveNorms(d, phase).forEach((a) => add(k.selectedRegArtefacts, a.id));
  } else {
    add(off, phase);
    sdlcOf(phase).forEach((a) => del(k.selectedArtefacts, a.id));
    regOfActiveNorms(d, phase).forEach((a) => del(k.selectedRegArtefacts, a.id));
  }
};
const togglePhaseCmd = defineCommand<{ phase: string; on: boolean }>({
  type: 'scope.togglePhase', label: (p) => `${p.on ? 'Include' : 'Exclude'} phase ${p.phase}`,
  run(d, p) {
    editScope(d, (k) => {
      setPhase(d, k, p.phase, p.on);
      if (k.selectedArtefacts.length === 0 && k.selectedRegArtefacts.length === 0) setPhase(d, k, p.phase, true);   // never an empty scope
    });
    refitPotential(d);
  },
});

const toggleRegCmd = defineCommand<{ id: string; on: boolean }>({
  type: 'scope.toggleRegArtefact', label: (p) => `${p.on ? 'Add' : 'Remove'} regulatory artefact ${p.id}`,
  run(d, p) { editScope(d, (k) => { if (p.on) add(k.selectedRegArtefacts, p.id); else del(k.selectedRegArtefacts, p.id); }); refitPotential(d); },
});
const selectAllCmd = defineCommand<{ on: boolean }>({
  type: 'scope.selectAll', label: (p) => (p.on ? 'Select the whole scope' : 'Clear the scope (keep the first phase)'),
  run(d, p) {
    const ids = phasesForScope().map((x) => x.id);
    editScope(d, (k) => {
      if (p.on) {
        k.phaseOff = [];
        k.selectedArtefacts = SDLC_ARTEFACTS.map((a) => a.id);
        ids.forEach((id) => regOfActiveNorms(d, id).forEach((a) => add(k.selectedRegArtefacts, a.id)));
      } else {
        const keep = PHASES[0]!.id;
        k.phaseOff = ids.filter((id) => id !== keep);
        k.selectedArtefacts = sdlcOf(keep).map((a) => a.id);
        const keepReg = new Set(regOfActiveNorms(d, keep).map((a) => a.id));
        k.selectedRegArtefacts = k.selectedRegArtefacts.filter((id) => keepReg.has(id));
      }
    });
    refitPotential(d);
  },
});
const setSeqCmd = defineCommand<{ kind: 'phase' | 'artefact'; id: string; value: number | null }>({
  type: 'scope.setSeq', label: (p) => `Set ramp-up sequence of ${p.id}`, coalesceKey: (p) => `scope.setSeq:${p.id}`,
  run(d, p) {
    editScope(d, (k) => {
      if (p.kind === 'phase') {
        const l = (k.phaseSeq ??= []), e = l.find((x) => x.id === p.id);
        if (e) e.seq = p.value; else l.push({ id: p.id, seq: p.value });
        return;
      }
      const list = p.id.startsWith('R') ? k.regArtefactsEdited : k.artefactsEdited, e = list.find((x) => x.id === p.id);
      if (e) e.seq = p.value ?? undefined;
    });
  },
});

export const toggleRegArtefact = (id: string, on: boolean): void => appStore().dispatch(toggleRegCmd({ id, on }));
export const selectAllPhases = (on: boolean): void => appStore().dispatch(selectAllCmd({ on }));
export const setSeq = (kind: 'phase' | 'artefact', id: string, value: number | null): void => appStore().dispatch(setSeqCmd({ kind, id, value }));
export const toggleArtefact = (id: string, on: boolean): void => appStore().dispatch(toggleArtefactCmd({ id, on }));
export const togglePhase = (phase: string, on: boolean): void => {
  if (PHASES.some((p) => p.id === phase) || phase === 'Cross-cutting') appStore().dispatch(togglePhaseCmd({ phase, on }));
};
