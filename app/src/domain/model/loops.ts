/** @calc-zone run-setup-taxes */
import { caseLoopPairs } from '../process/engineInputs';
import type { Ctx } from '../ctx';
import { activeArtefacts, totalEffort } from '../scope';

/** External rework loops of the case's process (back flows or boundary events, D-B20): extra effort re-done in a downstream phase. */
export function loopExternalReworkEffort(c: Ctx) {
  const applied = c.inp.c('loopExternalApply'), totW = totalEffort(c.a, c.s), act = activeArtefacts(c.a, c.s);
  return caseLoopPairs(c.s).filter((lp) => lp.extReworkPct > 0 && lp.extFrom && lp.extTo).map((lp) => {
    const fromEffort = act.filter((a) => a.phase === lp.extFrom).reduce((t, a) => t + (a.w || 0), 0);
    const rawAddedW = fromEffort * lp.extReworkPct * lp.extCostShare;
    return { id: lp.id, rawAddedW, rate: totW ? rawAddedW / totW : 0, applied };
  });
}

export const loopExternalTotalRate = (c: Ctx): number =>
  loopExternalReworkEffort(c).reduce((s, l) => s + (l.applied ? l.rate : 0), 0);
