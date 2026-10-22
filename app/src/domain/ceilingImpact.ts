/** @calc-zone delivery-views */
import type { Ctx } from './ctx';
import type { WArtefact } from './artefacts';
import { model } from './model/overlay';
import { phasesForScope } from './scopeView';
import { activeArtefacts } from './scope';

export interface ImpactRow {
  phaseId: string; name: string; pts: number; ownHuman: number; effortShare: number; count: number;
  top: { id: string; name: string; humanSup: number; pts: number }[];
}
export interface CeilingImpact { rows: ImpactRow[]; ceiling: number; potential: number; depth: number | null }

/**
 * Where the glass ceiling comes from: each phase contributes Σ(w·humanSup) ÷ Σw(scope) points, so the rows add up to the
 * scope's ceiling. Rows are sorted by contribution (highest first); `top` lists the three artefacts that weigh most.
 */
export function ceilingImpact(c: Ctx): CeilingImpact {
  const act = activeArtefacts(c.a, c.s), totW = act.reduce((s, a) => s + (+a.w || 0), 0);
  const rows: ImpactRow[] = totW > 0 ? phasesForScope().flatMap((p) => {
    const arts = act.filter((a) => a.phase === p.id);
    if (!arts.length) return [];
    const W = arts.reduce((s, a) => s + (+a.w || 0), 0), H = arts.reduce((s, a) => s + (+a.w || 0) * a.humanSup, 0);
    const top = [...arts].sort((x, y) => pts(y, totW) - pts(x, totW)).slice(0, 3).map((a) => ({ id: a.id, name: a.name, humanSup: a.humanSup, pts: pts(a, totW) }));
    return [{ phaseId: p.id, name: p.name, pts: H / totW, ownHuman: W ? H / W : 0, effortShare: (W / totW) * 100, count: arts.length, top }];
  }).sort((x, y) => y.pts - x.pts) : [];
  const ceiling = rows.reduce((s, r) => s + r.pts, 0);
  let potential = 100 - ceiling, depth: number | null = null;
  try { const m = model(c); if (isFinite(m.auto)) potential = m.auto; if (isFinite(m.eff)) depth = m.eff; } catch { /* keep the derived potential */ }
  return { rows, ceiling, potential, depth };
}
const pts = (a: WArtefact, totW: number) => ((+a.w || 0) * a.humanSup) / totW;
