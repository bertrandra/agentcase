import { REG_ARTEFACTS, SDLC_ARTEFACTS, activeArtefacts, lifecycleWeight, type Ctx } from '@/domain';
import type { WArtefact } from '@/domain/artefacts';

export interface AdjustRow extends WArtefact { lifecycle: number; defaultAuto: number; defaultEffort: number }
const base = (a: WArtefact) => (a.isReg ? REG_ARTEFACTS : SDLC_ARTEFACTS).find((x) => x.id === a.id);

/** Rows of the "Adjust % auto & effort weight" table: the artefacts in scope, optionally filtered by phase. */
export function adjustRows(c: Ctx, phase: string): AdjustRow[] {
  return activeArtefacts(c.a, c.s).filter((a) => phase === 'ALL' || a.phase === phase).map((a) => ({
    ...a, lifecycle: lifecycleWeight(c.s, a.phase), defaultAuto: base(a)?.agentSup ?? a.agentSup, defaultEffort: base(a)?.effort ?? a.effort,
  }));
}
