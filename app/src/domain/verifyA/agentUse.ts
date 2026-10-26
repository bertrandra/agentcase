/** @calc-zone delivery-views */
import { AI_SKILL_PREMIUM } from '../rates';
import { COEF_DEFAULT, PHASES } from '../catalog';
import { phaseScope, activeArtefacts } from '../scope';
import { blendedTokenCostPer1M } from '../tokens';
import type { Live } from './fteVfte';
import { AUTH_LEVELS } from './agents';
import { tokenUsage as tokenUsageOf, type TokenUsage } from '../tuneB/tokens';
import { targetTeam } from './targetTeam';

const avg = (xs: number[]): number => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);

export interface RoleRow { role: string; mission: string; rule: string; fte: number; supervision: boolean }
export interface AuthRow { level: string; meaning: string; human: string; count: number; avgHuman: number }
export interface AgentDetail { roles: RoleRow[]; auth: AuthRow[]; runTotal: number; supETP: number; runRate: number }

const MEANING: Record<string, [string, string]> = {
  Assistance: ['Agent drafts, human owns the result', 'Owns & decides'], Copilot: ['Agent co-produces, human reviews closely', 'Reviews closely'],
  'Supervised autonomous': ['Agent produces, human spot-checks', 'Spot-checks'], Autonomous: ['Agent produces & self-checks', 'Light oversight'],
};

/** The five agentic roles sized from the input team, and the in-scope artefacts per AI authorization level (legacy renderAgentDetail). */
export function agentDetail(l: Live): AgentDetail {
  const e = l.m.base.etp, t = targetTeam(l), finops = (l.c.s.COEF?.['aiFinOpsFte'] ?? COEF_DEFAULT['aiFinOpsFte']) as number;
  const ai = Math.max(0.3, e / 12), prompt = Math.max(0.2, e / 20), qa = Math.max(0.2, e / 25);
  const roles: RoleRow[] = [
    { role: 'AI / Agent Engineer', mission: 'Designs & operates the agents', rule: 'max(0.3, FTE÷12)', fte: ai, supervision: false },
    { role: 'Skill / Prompt Engineer', mission: 'Maintains the skill/prompt library', rule: 'max(0.2, FTE÷20)', fte: prompt, supervision: false },
    { role: 'Agent Supervisor', mission: 'Reviews & validates AI outputs', rule: 'Residual × supShare', fte: t.supETP, supervision: true },
    { role: 'AI-FinOps', mission: 'Token cost steering & guardrails', rule: `${finops.toFixed(2)} (flat)`, fte: finops, supervision: false },
    { role: 'AI-QA', mission: 'Golden set, AI regression, red-team', rule: 'max(0.2, FTE÷25)', fte: qa, supervision: false },
  ];
  const act = activeArtefacts(l.c.a, l.c.s);
  const auth = AUTH_LEVELS.map((level) => {
    const list = act.filter((a) => a.aiAuth === level);
    return { level, meaning: MEANING[level]![0], human: MEANING[level]![1], count: list.length, avgHuman: avg(list.map((a) => a.humanSup)) };
  });
  return { roles, auth, runTotal: ai + prompt + finops + qa, supETP: t.supETP, runRate: Math.round(l.m.tgtTJM * AI_SKILL_PREMIUM) };
}

export interface UsageYear { label: string; ramp: number; vfte: number; arts: number; tokensM: number; tokenCost: number; infra: number }
export interface UsagePhase { id: string; name: string; n: number; avgAgent: number; effort: number }
export interface UsageAuth { level: string; n: number; avgAgent: number; effort: number; share: number }

/**
 * Agent runs per horizon year and the token volume they imply: the tuneB owner of `l.c` (legacy tokenUsageEstimate; model and engine are cached per
 * context).
 */
export const tokenUsage = (l: Live): TokenUsage => tokenUsageOf(l.c);

/** Consumption by year, phase and authorization level, and the headline figures (legacy renderAgentUsage). */
export function agentUsage(l: Live) {
  const { c, m, eng } = l, ys = eng.years(), adopt = ys.map((y) => y.adoptionEndPct), maxA = Math.max(...adopt) || 1,
    baseArt = Math.max(1, Math.round(m.base.etp * 6));
  const years: UsageYear[] = ys.map((y, i) => {
    const arts = baseArt * ((adopt[i] as number) / maxA);
    return { label: `Y${i + 1}`, ramp: adopt[i] as number, vfte: y.agentVfteEnd, arts, tokensM: (arts * m.tokensPerArt * 12) / 1e6, tokenCost: y.tokenCost,
      infra: y.infrastructureCost };
  });
  const act = activeArtefacts(c.a, c.s), ids = new Set(act.map((a) => a.phase));
  const phases: UsagePhase[] = PHASES.filter((p) => ids.has(p.id)).map((p) => {
    const list = act.filter((a) => a.phase === p.id), a = avg(list.map((x) => x.agentSup));
    return { id: p.id, name: p.name, n: list.length, avgAgent: a, effort: (list.length * a) / 100 };
  });
  const byAuth = AUTH_LEVELS.map((level) => {
    const list = act.filter((a) => a.aiAuth === level), a = avg(list.map((x) => x.agentSup));
    return { level, n: list.length, avgAgent: a, effort: (list.length * a) / 100 };
  });
  const tot = byAuth.reduce((s, x) => s + x.effort, 0) || 1, est = tokenUsage(l), end = eng.year(eng.horizonYears), sc = phaseScope(c.a, c.s);
  return { years, phases, auth: byAuth.map((x): UsageAuth => ({ ...x, share: (x.effort / tot) * 100 })), maxEffort: Math.max(1, ...phases.map((p) => p.effort)),
    summary: { endLabel: est.endLabel, vfte: end.agentVfteEnd, artsPerMonth: baseArt * ((adopt[adopt.length - 1] as number) / maxA), tokensM: est.y3,
      tokenCost: end.tokenCost, count: sc.count, totalArt: sc.totalArt } };
}

export interface RunRow { phase: string; phaseName: string; name: string; reg: boolean; runs: number[]; total: number; tokM: number; cost: number }

/** Agent runs allocated to each in-scope artefact (share = effort × automatable %), grouped by phase (legacy renderArtifactRuns). */
export function artifactRuns(l: Live) {
  const { c } = l, est = tokenUsage(l), blended = blendedTokenCostPer1M(c.s, c.tokenScale), act = activeArtefacts(c.a, c.s);
  const denom = act.reduce((s, a) => s + (a.effort || 0) * (a.agentSup || 0), 0) || 1;
  const idx = (p: string) => { const i = PHASES.findIndex((x) => x.id === p); return i < 0 ? 99 : i; };
  const name = (p: string) => (p === 'Cross-cutting' ? 'Cross-cutting (regulatory)' : PHASES.find((x) => x.id === p)?.name ?? p);
  const rows = act.slice().sort((a, b) => idx(a.phase) - idx(b.phase) || String(a.name).localeCompare(String(b.name))).map((a): RunRow => {
    const sh = ((a.effort || 0) * (a.agentSup || 0)) / denom, runs = est.agentRuns.map((r) => r * sh), total = runs.reduce((x, y) => x + y, 0),
      tokM = (total * est.tpa) / 1e6;
    return { phase: a.phase, phaseName: name(a.phase), name: a.name, reg: !!a.isReg, runs, total, tokM, cost: tokM * blended };
  });
  const sum = (f: (r: RunRow) => number) => rows.reduce((t, r) => t + f(r), 0);
  return { rows, count: act.length, years: est.agentRuns.length,
    totals: { runs: est.agentRuns.map((_, i) => sum((r) => r.runs[i] as number)), total: sum((r) => r.total), tokM: sum((r) => r.tokM),
      cost: sum((r) => r.cost) } };
}
