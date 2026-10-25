/** @calc-zone aggregate-views */
import type { Ctx } from '../ctx';
import { capability, currentLevel, pilotSizing, safeOverhead, tokenCache, coachView, sddView } from '../tune';
import { setupBreakdown } from '../tuneB/setup';
import { AIACT_TIERS, aiActKey, qualityView, riskBand, riskScore, wave2RiskPremium } from '../tuneB/risk';
import { headOf, membersOf, spreadOf, type Head, type Spread } from './aggTuneCore';
import type { Portfolio } from './types';

const num = (c: Ctx, id: string): number => { const v = c.inp.p(id); return Number.isNaN(v) ? 0 : v; };
const total = <T>(rows: T[], f: (r: T) => number): number => rows.reduce((a, r) => a + f(r), 0);

// ---- Agentic Setup -------------------------------------------------------------------------------------------------------------------------------
export interface SetupRow extends Head { tooling: number; training: number; coaching: number; governance: number; total: number; duration: number;
  infraMonthly: number }
export interface SetupAgg { rows: SetupRow[]; totals: Omit<SetupRow, keyof Head | 'duration' | 'infraMonthly'>; spread: Spread; duration: Spread }

/**
 * The four one-off setup lines of each product and their sum (`setupBreakdown`); the total line adds the products' lines, the spread describes the
 * product totals.
 */
export function aggSetup(pf: Portfolio, productIds: string[]): SetupAgg {
  const rows = membersOf(pf, productIds).map((m): SetupRow => {
    const b = setupBreakdown(m.ctx), amount = (id: string) => b.lines.find((l) => l.id === id)?.amount ?? 0;
    return { ...headOf(m), tooling: amount('tooling'), training: amount('training'), coaching: amount('coaching'), governance: amount('governance'),
      total: b.total, duration: num(m.ctx, 'setupDuration'), infraMonthly: num(m.ctx, 'infra') };
  });
  return {
    rows, spread: spreadOf(rows.map((r) => r.total)), duration: spreadOf(rows.map((r) => r.duration)),
    totals: { tooling: total(rows, (r) => r.tooling), training: total(rows, (r) => r.training), coaching: total(rows, (r) => r.coaching),
    governance: total(rows, (r) => r.governance), total: total(rows, (r) => r.total) },
  };
}

// ---- Maturity & measurement ----------------------------------------------------------------------------------------------------------------------
export interface MaturityRow extends Head { sdd: number; sddName: string; harness: number; taxCut: number; coachY1: number; coachCruise: number;
  coachCostY1: number; level: number }
export interface MaturityAgg { rows: MaturityRow[]; sdd: Spread; coachY1: Spread; harness: Spread; totals: { coachCostY1: number } }

/** SDD / tooling maturity and the coaching curve of each product, with min / max / average over the selection and the summed first-year coaching cost. */
export function aggMaturity(pf: Portfolio, productIds: string[]): MaturityAgg {
  const rows = membersOf(pf, productIds).map((m): MaturityRow => {
    const s = sddView(m.ctx), k = coachView(m.ctx);
    return { ...headOf(m), sdd: s.sdd, sddName: s.name, harness: s.harness, taxCut: s.taxCut, coachY1: k.y1, coachCruise: k.cruise,
      coachCostY1: k.costs[0] ?? 0, level: currentLevel(m.ctx) };
  });
  return { rows, sdd: spreadOf(rows.map((r) => r.sdd)), coachY1: spreadOf(rows.map((r) => r.coachY1)), harness: spreadOf(rows.map((r) => r.harness)),
    totals: { coachCostY1: total(rows, (r) => r.coachCostY1) } };
}

// ---- Program & completeness ----------------------------------------------------------------------------------------------------------------------
export interface ProgramRow extends Head {
  pilotFte: number; pilotWeeks: number; pilotCost: number; capOps: number; capTarget: number; capPct: number; pods: number; overheadPct: number;
    stage: string; cacheReduction: number;
}
export interface ProgramAgg { rows: ProgramRow[]; pilotCost: Spread; overhead: Spread;
  totals: { pilotFte: number; pilotCost: number; capOps: number; capTarget: number; capPct: number } }

/**
 * Pilot sizing, internal capability and multi-pod overhead of each product; the total line sums pilot staff / cost and capability, the percentage is
 * recomputed from those sums.
 */
export function aggProgram(pf: Portfolio, productIds: string[]): ProgramAgg {
  const rows = membersOf(pf, productIds).map((m): ProgramRow => {
    const p = pilotSizing(m.ctx), c = capability(m.ctx), o = safeOverhead(m.ctx);
    return { ...headOf(m), pilotFte: p.fte, pilotWeeks: p.totalWeeks, pilotCost: p.cost, capOps: c.ops, capTarget: c.target, capPct: c.pct, pods: o.pods,
      overheadPct: o.overheadPct, stage: o.stage, cacheReduction: tokenCache(m.ctx).reduction };
  });
  const ops = total(rows, (r) => r.capOps), target = total(rows, (r) => r.capTarget);
  return {
    rows, pilotCost: spreadOf(rows.map((r) => r.pilotCost)), overhead: spreadOf(rows.map((r) => r.overheadPct)),
    totals: { pilotFte: total(rows, (r) => r.pilotFte), pilotCost: total(rows, (r) => r.pilotCost), capOps: ops, capTarget: target,
    capPct: target > 0 ? Math.round((ops / target) * 100) : 0 },
  };
}

// ---- Risk & compliance ---------------------------------------------------------------------------------------------------------------------------
export interface RiskRow extends Head {
  tier: string; tierLabel: string; tierApplied: boolean; score: number; band: string; registerApplied: boolean; premium: number; qualityApplied: boolean;
    diBar: number;
}
export interface RiskAgg { rows: RiskRow[]; score: Spread; diBar: Spread; counts: { highTier: number; highRisk: number; applied: number } }

/** AI-Act tier, risk-register score and AI code-quality premium of each product, with the premium each one adds to the Decision Intelligence bar. */
export function aggRisk(pf: Portfolio, productIds: string[]): RiskAgg {
  const rows = membersOf(pf, productIds).map((m): RiskRow => {
    const k = aiActKey(m.ctx), s = riskScore(m.ctx), q = qualityView(m.ctx);
    return {
      ...headOf(m), tier: k, tierLabel: AIACT_TIERS[k]?.label ?? k, tierApplied: m.ctx.inp.c('aiActApply'), score: s, band: riskBand(s).label,
      registerApplied: m.ctx.inp.c('riskApply'),
      premium: q.premium, qualityApplied: q.applied, diBar: wave2RiskPremium(m.ctx),
    };
  });
  return {
    rows, score: spreadOf(rows.map((r) => r.score)), diBar: spreadOf(rows.map((r) => r.diBar)),
    counts: { highTier: rows.filter((r) => r.tier === 'high' || r.tier === 'unacceptable').length, highRisk: rows.filter((r) => r.band === 'High').length,
    applied: rows.filter((r) => r.diBar > 0).length },
  };
}
