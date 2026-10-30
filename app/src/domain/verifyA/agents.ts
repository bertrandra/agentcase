/** @calc-zone delivery-views */
import { authRank } from '../authority';
import { artTeamSkill, skillMapOf } from '../baseline/skills';
import type { Ctx } from '../ctx';
import { lceExpectedIter, lceLoops } from '../model/lce';
import { loopExternalReworkEffort } from '../model/loops';
import { activeArtefacts } from '../scope';
import { activitiesOfActor, caseLoopPairs, customActors } from '../process/engineInputs';
import { blendedTokenCostPer1M } from '../tokens';
import type { LoopPair } from '../types/catalog';
import catalog from './agentCatalog.json';

export interface Agent { id: string; skill: string; aiAuth: string; artifactIds: string[]; capacity: number }
export const AGENT_CATALOG = catalog as Agent[];
export { AUTH_LEVELS } from '../authority';
/** Phases of the agent-directory selector. */
export const REG_PHASES = ['L0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'L8', 'L9', 'L10', 'Cross-cutting'];
export type LoopPairFull = LoopPair & { artA: string; artB: string; internalNote: string };
/** The rework loops of the case's process (back flows or boundary events, D-B20): one owner, `domain/process`. */
export const pairsOf = (c: Pick<Ctx, 's'>): LoopPairFull[] => caseLoopPairs(c.s) as LoopPairFull[];

/**
 * The agents of the case: the shipped agent catalogue, then each custom agent of its process (an `ac:actor kind="agent"` resource the catalogue
 * does not hold, B5): skill = its capability (else its name), authority = that of its first activity, the activities it performs, 25 runs a day.
 */
export function agentsOf(c: Pick<Ctx, 's'>): Agent[] {
  const custom = customActors(c.s).filter((a) => a.kind === 'agent').map((a): Agent => {
    const acts = activitiesOfActor(c.s, a.id);
    return { id: a.id, skill: a.capability ?? a.name, aiAuth: acts[0]?.aiAuthority || 'Supervised autonomous', artifactIds: acts.map((x) => x.id),
      capacity: 25 };
  });
  return custom.length ? [...AGENT_CATALOG, ...custom] : AGENT_CATALOG;
}

export const agentName = (a: Agent): string => `${a.skill} Agent — ${a.aiAuth}`;
const find = (c: Ctx, id: string) => c.a.sdlc.find((x) => x.id === id) ?? c.a.reg.find((x) => x.id === id);
const arts = (c: Ctx, a: Agent) => a.artifactIds.map((id) => find(c, id)).filter((x): x is NonNullable<typeof x> => !!x);

export interface AgentRow { agent: Agent; avgSup: number | null; produced: string }

/** Execution agents active in a phase ('ALL' for every one), by authorization level then skill. */
export function agentDirectory(c: Ctx, phase: string): AgentRow[] {
  return agentsOf(c).filter((a) => phase === 'ALL' || arts(c, a).some((x) => x.phase === phase))
    .sort((a, b) => authRank(a.aiAuth, 0) - authRank(b.aiAuth, 0) || a.skill.localeCompare(b.skill))
    .map((agent) => {
      const list = arts(c, agent);
      return { agent, avgSup: list.length ? Math.round(list.reduce((s, x) => s + (x.agentSup || 0), 0) / list.length) : null,
        produced: agent.artifactIds.map((id) => { const x = find(c, id); return x ? `${id} (${x.name})` : id; }).join(', ') };
    });
}

/** Team skills that have in-scope work in a phase. */
export function rolesForPhase(c: Ctx, phase: string): string[] {
  const map = skillMapOf(c.s), set = new Set<string>();
  activeArtefacts(c.a, c.s).forEach((a) => { if (phase === 'ALL' || a.phase === phase) set.add(artTeamSkill(a, map)); });
  return [...set].sort();
}

/** Iterations of loop `idx`: the declared count, or the calibrated expectation when the loop-calibration flag is on. */
function iterFor(c: Ctx, lp: LoopPairFull, idx: number): number {
  if (!c.s.MODEL.FLAGS?.lce) return lp.internalIter || 0;
  const l = lceLoops(c).loops[idx];
  return l ? lceExpectedIter(l.pAccept, c.s.MODEL.LCE.nMax || 5) : lp.internalIter || 0;
}

/** Informational token cost of the internal agentic loops (never feeds model()). */
export function loopInternalTokenCost(c: Ctx) {
  const cost = blendedTokenCostPer1M(c.s, c.tokenScale);
  let tpa = c.inp.p('tokensPerArt'); if (isNaN(tpa)) tpa = 50000;
  let rpd = c.inp.p('runsPerDay'); if (isNaN(rpd)) rpd = 25;
  const applied = c.inp.c('loopInternalApply');
  const byPair = pairsOf(c).map((lp, idx) => {
    const n = [lp.artA, lp.artB].filter((id) => c.a.sdlc.some((x) => x.id === id)).length, iterations = iterFor(c, lp, idx);
    const runs = applied ? n * rpd * iterations : 0, tokM = (runs * tpa) / 1e6;
    return { id: lp.id, iterations, runs, tokM, cost: tokM * cost };
  });
  const totM = byPair.reduce((s, p) => s + p.tokM, 0);
  return { applied, totM, cost: totM * cost, byPair };
}

export interface LoopRow { label: string; arts: string; internal: string; external: string; share: string; tokens: string; added: string }

/** The agentic loop-pairs table, every cell as the legacy section prints it. */
export function loopRows(c: Ctx): LoopRow[] {
  const internal = loopInternalTokenCost(c), external = loopExternalReworkEffort(c);
  return pairsOf(c).map((lp) => {
    const iBy = internal.byPair.find((p) => p.id === lp.id), eBy = external.find((p) => p.id === lp.id);
    const have = [lp.artA, lp.artB].filter((id) => c.a.sdlc.some((x) => x.id === id));
    const rawAdded = eBy ? (eBy.applied ? eBy.rawAddedW : 0) : 0;
    return {
      label: lp.label, arts: have.join(' ↔ '), internal: `${lp.internalIter} (${lp.internalNote})`,
      external: lp.extReworkPct > 0 ? `${Math.round(lp.extReworkPct * 100)}% ${lp.extFrom}→${lp.extTo}` : '— (same phase, purely internal)',
      share: lp.extCostShare > 0 ? `${Math.round(lp.extCostShare * 100)}% of effort` : '—',
      tokens: iBy && iBy.tokM > 0 ? `${iBy.tokM.toFixed(2)}M tok` : '—',
      added: eBy ? (rawAdded > 0 ? `+${rawAdded.toFixed(1)} w → ${lp.extTo}` : eBy.applied ? '0 (no rework triggered)' : 'not applied') : '—',
    };
  });
}
