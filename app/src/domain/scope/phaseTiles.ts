/** @calc-zone scope-automation */
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';
import { phasesForScope, regOfActiveNorms, type PhaseState } from '../scopeView';

/** One tile of the quick phase selector (legacy renderQuickPhases): effort share, glass-ceiling contribution and human supervision of a phase. */
export interface PhaseTile {
  id: string; name: string; state: PhaseState; share: number; contrib: number; humanSup: number; nStd: number; nReg: number; empty: boolean;
}
export interface PhaseTiles { tiles: PhaseTile[]; selected: number; total: number }

/** Per-phase metrics over the ACTIVE artefacts (SDLC + selected regulatory + cross-cutting) with lifecycle weights — same math as the glass ceiling. */
export function phaseTiles(c: Ctx): PhaseTiles {
  const by = new Map<string, { w: number; hw: number }>();
  let totW = 0;
  for (const a of activeArtefacts(c.a, c.s)) {
    const w = +a.w || 0, e = by.get(a.phase) ?? { w: 0, hw: 0 };
    totW += w; e.w += w; e.hw += w * (+a.humanSup || 0); by.set(a.phase, e);
  }
  const off = new Set(c.s.phaseOff ?? []);
  const tiles = phasesForScope().map((p) => {
    const v = by.get(p.id), reg = regOfActiveNorms(c, p.id), sdlc = c.a.sdlc.filter((a) => a.phase === p.id);
    const nStd = sdlc.filter((a) => c.a.selected.has(a.id)).length, nReg = reg.filter((a) => c.a.selectedReg.has(a.id)).length;
    const total = sdlc.length + reg.length, on = nStd + nReg;
    const state: PhaseState = off.has(p.id) || total === 0 || on === 0 ? 'none' : on === total ? 'all' : 'some';
    return { id: p.id, name: p.name, state, share: v && totW ? (v.w / totW) * 100 : 0, contrib: v && totW ? v.hw / totW : 0,
      humanSup: v && v.w ? v.hw / v.w : 0, nStd, nReg, empty: total === 0 };
  });
  return { tiles, selected: c.a.sdlc.filter((a) => c.a.selected.has(a.id)).length, total: c.a.sdlc.length };
}
