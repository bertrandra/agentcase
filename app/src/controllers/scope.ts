import { PHASES, REG_ARTEFACTS, SDLC_ARTEFACTS } from '@/domain';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

/** Regulatory artefacts of a phase whose norm is ticked (regardless of individual selection). */
const regOfActiveNorms = (d: Doc, phase: string) =>
  REG_ARTEFACTS.filter((a) => a.phase === phase && (d.selectedNorms as string[] | undefined)?.includes(`${a.industry}:${a.norm}`));
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

export const toggleArtefact = (id: string, on: boolean): void => appStore().dispatch(toggleArtefactCmd({ id, on }));
export const togglePhase = (phase: string, on: boolean): void => {
  if (PHASES.some((p) => p.id === phase) || phase === 'Cross-cutting') appStore().dispatch(togglePhaseCmd({ phase, on }));
};
