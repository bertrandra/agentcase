/** @calc-zone scope-automation */
import { ALL_PHASE_IDS } from './catalog';
import type { ArtefactSets, WArtefact } from './artefacts';
import type { CaseState } from './types/state';

/** Regulatory artefacts in scope: gated on content (selection non-empty), not on the panel toggle. */
export function regActive(a: ArtefactSets, s: CaseState): WArtefact[] {
  if (!s.regInclude || !a.selectedReg.size) return [];
  return a.reg.filter((x) => a.selectedReg.has(x.id));
}

/** Selected SDLC artefacts + selected regulatory artefacts. */
export function activeArtefacts(a: ArtefactSets, s: CaseState): WArtefact[] {
  return a.sdlc.filter((x) => a.selected.has(x.id)).concat(regActive(a, s));
}

export const sumEffort = (list: WArtefact[]): number => list.reduce((t, x) => t + (+x.w || 0), 0);

/** Effort of every SDLC artefact plus the active regulatory ones (legacy sumEffort() with no argument). */
export function totalEffort(a: ArtefactSets, s: CaseState): number {
  return sumEffort(a.sdlc.concat(regActive(a, s)));
}

export interface PhaseScope {
  weight: number; count: number; totalArt: number; avgHuman: number; avgAgent: number;
  nPhases: number; nPhasesTotal: number; selW: number; totW: number;
}

export function phaseScope(a: ArtefactSets, s: CaseState): PhaseScope {
  const act = activeArtefacts(a, s);
  const totW = totalEffort(a, s), selW = sumEffort(act);
  const avg = (k: 'humanSup' | 'agentSup') => (selW ? Math.round(act.reduce((t, x) => t + (+x.w || 0) * x[k], 0) / selW) : 0);
  return {
    weight: totW ? selW / totW : 0, count: act.length, totalArt: a.sdlc.length,
    avgHuman: avg('humanSup'), avgAgent: avg('agentSup'),
    nPhases: new Set(act.map((x) => x.phase)).size, nPhasesTotal: ALL_PHASE_IDS.length, selW, totW,
  };
}
