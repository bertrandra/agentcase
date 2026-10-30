/** @calc-zone scope-automation */
import { REG_ARTEFACTS, SDLC_ARTEFACTS } from './catalog';
import { lifecycleWeight } from './lifecycle';
import type { Artefact } from './types/catalog';
import type { ArtefactEdit, CaseState } from './types/state';
import { caseViews } from './process/engineInputs';
import { scopeOf } from './process/scope';
import { ruledOut } from './scopeRules';
import { caseDecisions, withDecided } from './decisionRules';

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

/**
 * All artefacts of the case with edits and weights applied: the activities of its process document (catalogue and custom ones, with their own
 * parameters: spec § 7 phase 2, F-B18), or the edited catalogues for a version 2 object without a document. The selection leaves out what the
 * process's scope rules exclude (F-B51); the decisions bound to its business-rule tasks set the parameters they decide (F-B62).
 */
export function workingArtefacts(s: CaseState): ArtefactSets {
  const k = scopeOf(s), v = caseViews(s), out = ruledOut(s), keep = (ids: string[]): Set<string> => new Set(out.size ? ids.filter((i) => !out.has(i)) : ids);
  // the scope rules of the process (F-B51, B5b) take out what their conditions exclude
  const selected = keep(k.selectedArtefacts), selectedReg = keep(k.selectedRegArtefacts);
  const dec = v ? caseDecisions(s, [v.sdlc, v.reg], (id) => selected.has(id) || selectedReg.has(id)) : null;
  return {
    sdlc: withWeights(v ? withDecided(v.sdlc, dec) : editedArtefacts(SDLC_ARTEFACTS, k.artefactsEdited), s),
    reg: withWeights(v ? withDecided(v.reg, dec) : editedArtefacts(REG_ARTEFACTS, k.regArtefactsEdited), s),
    selected, selectedReg,
  };
}
