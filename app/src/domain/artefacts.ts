import { REG_ARTEFACTS, SDLC_ARTEFACTS } from './catalog';
import { lifecycleWeight } from './lifecycle';
import type { Artefact } from './types/catalog';
import type { ArtefactEdit, CaseState } from './types/state';

/** An artefact as the engine sees it: catalogue defaults + the case's edits, with its effective weight w = effort × lifecycleWeight. */
export interface WArtefact extends Artefact { w: number }

function applyEdits(base: Artefact[], edits: ArtefactEdit[] | undefined): Artefact[] {
  const by = new Map((edits ?? []).map((e) => [e.id, e]));
  return base.map((a) => {
    const e = by.get(a.id);
    if (!e) return a;
    return { ...a, agentSup: e.agentSup ?? a.agentSup, humanSup: e.humanSup ?? a.humanSup, effort: e.effort ?? a.effort };
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
  return {
    sdlc: withWeights(applyEdits(SDLC_ARTEFACTS, s.artefactsEdited), s),
    reg: withWeights(applyEdits(REG_ARTEFACTS, s.regArtefactsEdited), s),
    selected: new Set(s.selectedArtefacts ?? []),
    selectedReg: new Set(s.selectedRegArtefacts ?? []),
  };
}
