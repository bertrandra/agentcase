import { PHASES } from '../catalog';
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';
import type { Phase } from '../types/catalog';

/** Ids of the phases that hold at least one in-scope artefact (legacy activePhaseIds). */
export const activePhaseIds = (c: Ctx): Set<string> => new Set(activeArtefacts(c.a, c.s).map((a) => a.phase));

/** Catalogue phases with the case's ramp-up sequence overrides applied (legacy phaseSeq). */
export function phasesWithSeq(c: Ctx): Phase[] {
  const over = new Map((c.s.phaseSeq ?? []).map((e) => [e.id, e.seq]));
  return PHASES.map((p) => { const o = over.get(p.id); return o != null ? { ...p, seq: o } : p; });
}
