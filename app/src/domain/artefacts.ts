/** @calc-zone scope-automation */
import { REG_ARTEFACTS, SDLC_ARTEFACTS } from './catalog';
import { lifecycleWeight } from './lifecycle';
import type { Artefact } from './types/catalog';
import type { ArtefactEdit, CaseState } from './types/state';
import { scopeOf } from './process/scope';

/** An artefact as the engine sees it: catalogue defaults + the case's edits, with its effective weight w = effort × lifecycleWeight. */
export interface WArtefact extends Artefact { w: number }

/** Catalogue artefacts with legacy edit records applied (a missing record or value: the catalogue's). */
export function editedArtefacts(base: Artefact[], edits: ArtefactEdit[] | undefined): Artefact[] {
  const by = new Map((edits ?? []).map((e) => [e.id, e]));
  return base.map((a) => {
    const e = by.get(a.id);
    if (!e) return a;
    return { ...a, agentSup: e.agentSup ?? a.agentSup, humanSup: e.humanSup ?? a.humanSup, effort: e.effort ?? a.effort, seq: e.seq ?? a.seq };
  });
}

function withWeights(list: Artefact[], s: CaseState): WArtefact[] {
  const memo = new Map<string, number>();
  const lw = (p: string) => { let v = memo.get(p); if (v === undefined) { v = lifecycleWeight(s, p); memo.set(p, v); } return v; };
  return list.map((a) => ({ ...a, w: (+a.effort || 0) * lw(a.phase) }));
}

export interface ArtefactSets { sdlc: WArtefact[]; reg: WArtefact[]; selected: Set<string>; selectedReg: Set<string> }

/** All artefacts of the case with edits and weights applied. */
export function workingArtefacts(s: CaseState): ArtefactSets {
  const k = scopeOf(s);
  return {
    sdlc: withWeights(editedArtefacts(SDLC_ARTEFACTS, k.artefactsEdited), s),
    reg: withWeights(editedArtefacts(REG_ARTEFACTS, k.regArtefactsEdited), s),
    selected: new Set(k.selectedArtefacts),
    selectedReg: new Set(k.selectedRegArtefacts),
  };
}
