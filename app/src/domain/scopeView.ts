/** @calc-zone scope-automation */
import { PHASES, REG_ARTEFACTS } from './catalog';
import type { WArtefact } from './artefacts';
import type { Ctx } from './ctx';
import { lifecycleWeight } from './lifecycle';
import { phaseScope } from './scope';
import type { Phase } from './types/catalog';

export type PhaseState = 'all' | 'some' | 'none';
export interface PhaseRow {
  phase: Phase; isCross: boolean; sdlc: WArtefact[]; reg: WArtefact[]; sdlcShown: WArtefact[]; regShown: WArtefact[];
  state: PhaseState; onCount: number; total: number; regOn: number; lifecycle: number;
}
export const CROSS_CUTTING: Phase = { id: 'Cross-cutting', name: 'Cross-cutting (regulatory & AI framing)', sdlc: 0, reg: 0, role: '', seq: 99 };
export const phasesForScope = (): Phase[] => [...PHASES, CROSS_CUTTING];

/** Regulatory artefacts of a phase whose norm is ticked (regardless of individual selection). */
export function regOfActiveNorms(c: Ctx, phaseId: string): WArtefact[] {
  const norms = new Set(c.s.selectedNorms ?? []);
  return c.a.reg.filter((a) => a.phase === phaseId && norms.has(`${a.industry}:${a.norm}`));
}

/** Per-phase view of the scope selector (counts, tri-state checkbox, lifecycle weight). Empty phases are dropped. */
export function phaseRows(c: Ctx, selectedOnly: boolean): PhaseRow[] {
  const off = new Set(c.s.phaseOff ?? []);
  const seqOf = new Map((c.s.phaseSeq ?? []).map((x) => [x.id, x.seq]));
  return phasesForScope().map((p) => {
    const phase = seqOf.has(p.id) ? { ...p, seq: seqOf.get(p.id) as number } : p;
    const sdlc = c.a.sdlc.filter((a) => a.phase === phase.id), reg = regOfActiveNorms(c, phase.id);
    const onSdlc = sdlc.filter((a) => c.a.selected.has(a.id)).length, regOn = reg.filter((a) => c.a.selectedReg.has(a.id)).length;
    const total = sdlc.length + reg.length, onCount = onSdlc + regOn;
    const state: PhaseState = off.has(phase.id) || total === 0 || onCount === 0 ? 'none' : onCount === total ? 'all' : 'some';
    return {
      phase, isCross: phase.id === 'Cross-cutting', sdlc, reg, state, onCount, total, regOn, lifecycle: lifecycleWeight(c.s, phase.id),
      sdlcShown: selectedOnly ? sdlc.filter((a) => c.a.selected.has(a.id)) : sdlc, regShown: selectedOnly ? reg.filter((a) => c.a.selectedReg.has(a.id)) : reg,
    };
  }).filter((r) => (selectedOnly ? r.sdlcShown.length + r.regShown.length : r.sdlc.length + r.reg.length) > 0);
}

/** "10/53 SDLC art. · 3 reg. art. · 28% effort · 3/11 ph." */
export function scopeSummary(c: Ctx): string {
  const sc = phaseScope(c.a, c.s), regN = c.a.selectedReg.size;
  return `${sc.count}/${sc.totalArt} SDLC art.${regN ? ` · ${regN} reg art.` : ''} · ${Math.round(sc.weight * 100)}% effort · ${sc.nPhases}/${sc.nPhasesTotal} ph.`;
}
export const allRegCount = REG_ARTEFACTS.length;
