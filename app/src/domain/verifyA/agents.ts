import { LOOP_PAIRS } from '../catalog';
import { artTeamSkill, skillMapOf } from '../baseline/skills';
import type { Ctx } from '../ctx';
import { lceExpectedIter, lceLoops } from '../model/lce';
import { loopExternalReworkEffort } from '../model/loops';
import { activeArtefacts } from '../scope';
import { blendedTokenCostPer1M } from '../tokens';
import type { LoopPair } from '../types/catalog';
import catalog from './agentCatalog.json';

export interface Agent { id: string; skill: string; aiAuth: string; artifactIds: string[]; capacity: number }
export const AGENT_CATALOG = catalog as Agent[];
export const AUTH_LEVELS = ['Assistance', 'Copilot', 'Supervised autonomous', 'Autonomous'];
const AUTH_ORDER: Record<string, number> = { Assistance: 1, Copilot: 2, 'Supervised autonomous': 3, Autonomous: 4 };
/** Phases of the agent-directory selector. */
export const REG_PHASES = ['L0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'L8', 'L9', 'L10', 'Cross-cutting'];
export type LoopPairFull = LoopPair & { artA: string; artB: string; internalNote: string };
const PAIRS = LOOP_PAIRS as LoopPairFull[];

export const agentName = (a: Agent): string => `${a.skill} Agent — ${a.aiAuth}`;
const arts = (c: Ctx, a: Agent) => a.artifactIds.map((id) => c.a.sdlc.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);

export interface AgentRow { agent: Agent; avgSup: number | null; produced: string }

/** Execution agents active in a phase ('ALL' for every one), by authorization level then skill. */
export function agentDirectory(c: Ctx, phase: string): AgentRow[] {
  return AGENT_CATALOG.filter((a) => phase === 'ALL' || arts(c, a).some((x) => x.phase === phase))
    .sort((a, b) => (AUTH_ORDER[a.aiAuth] || 0) - (AUTH_ORDER[b.aiAuth] || 0) || a.skill.localeCompare(b.skill))
    .map((agent) => {
      const list = arts(c, agent);
      return { agent, avgSup: list.length ? Math.round(list.reduce((s, x) => s + (x.agentSup || 0), 0) / list.length) : null,
        produced: agent.artifactIds.map((id) => { const x = c.a.sdlc.find((y) => y.id === id); return x ? `${id} (${x.name})` : id; }).join(', ') };
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
  const byPair = PAIRS.map((lp, idx) => {
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
  return PAIRS.map((lp) => {
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
