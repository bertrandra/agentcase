import { STATUS_LIFECYCLE } from '../catalog';
import type { Ctx } from '../ctx';
import { khAsisScore } from '../knowledge';
import { statusTable } from '../lifecycle';
import { PRODUCT_PROFILES, currentProfileId, maturityInfo, maturityMapOf } from '../tune';
import { runSizingView, supervisionSplit } from '../tuneB/runSizing';
import { headOf, membersOf, spreadOf, type Head, type Spread } from './aggTuneCore';
import { knowledgeRow, knowledgeTotals, type KnowledgeRow, type KnowledgeTotals } from './knowledge';
import type { Portfolio } from './types';

const num = (c: Ctx, id: string): number => { const v = c.inp.p(id); return Number.isNaN(v) ? 0 : v; };
const last = (a: number[]): number => a[a.length - 1] ?? 0;

// ---- Maturity levels (L1-L4): thresholds per product -------------------------------------------------------------------------------------------------
export interface MaturityMapRow extends Head { ramp: number[]; share: number[]; labels: string[]; reached: number; adoptionLevel: number; shareLevel: number; adoptionY3: number; cap: number }
export interface MaturityMapAgg { rows: MaturityMapRow[]; ramp: Spread[]; share: Spread[]; reached: Spread; uniform: boolean }

/** The L1-L4 thresholds each product of the selection carries (its effective MATURITY_MAP), the level it reaches, and min / max / average of every threshold. */
export function aggMaturityMap(pf: Portfolio, productIds: string[]): MaturityMapAgg {
  const rows = membersOf(pf, productIds).map((m): MaturityMapRow => {
    const mm = maturityMapOf(m.state), mi = maturityInfo(m.ctx);
    return { ...headOf(m), ramp: mm.rampBounds, share: mm.shareBounds, labels: mm.labels, reached: mi.capped, adoptionLevel: mi.lr, shareLevel: mi.ls, adoptionY3: mi.rampY3, cap: mi.cap };
  });
  const per = (pick: (r: MaturityMapRow) => number[]): Spread[] => [0, 1, 2, 3].map((i) => spreadOf(rows.map((r) => pick(r)[i] ?? 0)));
  const ramp = per((r) => r.ramp), share = per((r) => r.share);
  return { rows, ramp, share, reached: spreadOf(rows.map((r) => r.reached)), uniform: [...ramp, ...share].every((s) => s.min === s.max) };
}

// ---- Status & phase weight: posture and weights per product ------------------------------------------------------------------------------------------
export interface LifecycleRow extends Head { used: boolean; pos: number; profile: string; postures: number[]; edited: number }
export interface LifecycleAgg { rows: LifecycleRow[]; statuses: { id: string; label: string }[]; postures: Spread[]; pos: Spread; editedProducts: number }

/** Per product: is the lifecycle axis on, its position and profile, the automation posture of each status, and how many matrix cells differ from the benchmark. */
export function aggLifecycle(pf: Portfolio, productIds: string[]): LifecycleAgg {
  const rows = membersOf(pf, productIds).map((m): LifecycleRow => {
    const table = statusTable(m.state);
    const edited = table.reduce((n, s, i) => {
      const def = STATUS_LIFECYCLE[i] ?? s, w = Object.keys(s.weights).filter((k) => Math.abs((s.weights[k] ?? 1) - (def.weights[k] ?? 1)) > 0.001).length;
      return n + w + (Math.abs(s.autoPosture - def.autoPosture) > 0.001 ? 1 : 0);
    }, 0);
    const pid = currentProfileId(m.state.lifecyclePos), profile = PRODUCT_PROFILES.find((p) => p.id === pid)?.label ?? pid;
    return { ...headOf(m), used: m.state.lifecycleUse, pos: m.state.lifecyclePos, profile, postures: table.map((s) => s.autoPosture), edited };
  });
  return {
    rows, statuses: STATUS_LIFECYCLE.map((s) => ({ id: s.id, label: s.label ?? s.id })), pos: spreadOf(rows.map((r) => r.pos)),
    postures: STATUS_LIFECYCLE.map((_, i) => spreadOf(rows.map((r) => r.postures[i] ?? 1))), editedProducts: rows.filter((r) => r.edited > 0).length,
  };
}

// ---- Knowledge hub: per-product subset (reuses the Knowledge-transfer table lines) --------------------------------------------------------------------
export interface KnowledgeAggRow extends KnowledgeRow { id: string; wave: string; asisScore: number; curationFTE: number; setupBase: number; ownFields: number }
export interface KnowledgeAgg { rows: KnowledgeAggRow[]; totals: KnowledgeTotals; target: Spread; asis: Spread; users: number }

/** The hub subset of each product (enabled, AS-IS score and CC, target, curation, setup base, domains, KT lead) with the domain's own totals (`knowledgeTotals`). */
export function aggKnowledge(pf: Portfolio, productIds: string[]): KnowledgeAgg {
  const rows = membersOf(pf, productIds).map((m): KnowledgeAggRow => {
    const p = pf.products.find((x) => x.id === m.id)!;
    return {
      ...knowledgeRow(pf, m.id), id: m.id, wave: m.wave, asisScore: khAsisScore(m.ctx), curationFTE: num(m.ctx, 'khCurationFTE'), setupBase: num(m.ctx, 'khSetupBase'),
      ownFields: Object.values(p.knowledge).filter((v) => v !== undefined).length,
    };
  });
  const on = rows.filter((r) => r.usesHub);
  return { rows, totals: knowledgeTotals(rows), target: spreadOf(on.map((r) => r.targetCC)), asis: spreadOf(rows.map((r) => r.asisCC)), users: on.length };
}

// ---- Run-team sizing -------------------------------------------------------------------------------------------------------------------------------
export interface RunSizingRow extends Head {
  mode: string; floorMin: number; floorPct: number; opsPerAgent: number; supCap: number; supFactor: number;
  runFte: number; runCost: number; agentsPerFte: number | null; supervisionFte: number; endLabel: string;
}
export interface RunSizingAgg { rows: RunSizingRow[]; runFte: Spread; opsPerAgent: Spread; floorMin: Spread; totals: { runFte: number; runCost: number; supervisionFte: number } }

/** The sizing policy of each product, what it gives at the end of the product's horizon, and the sums of those end-of-horizon figures. */
export function aggRunSizing(pf: Portfolio, productIds: string[]): RunSizingAgg {
  const rows = membersOf(pf, productIds).map((m): RunSizingRow => {
    const v = runSizingView(m.ctx), sp = supervisionSplit(m.ctx), coef = m.state.COEF as Record<string, number>;
    return {
      ...headOf(m), mode: m.ctx.inp.v('runSizeMode') || 'hybrid', floorMin: num(m.ctx, 'runFloorMin'), floorPct: num(m.ctx, 'runFloorPct'), opsPerAgent: num(m.ctx, 'runOpsPerAgent'),
      supCap: coef.supShareCap ?? 0, supFactor: coef.supShareFactor ?? 0, runFte: last(v.rt), runCost: last(v.rc), agentsPerFte: last(v.perFte as number[]) || null,
      supervisionFte: sp.supETP, endLabel: sp.endLabel,
    };
  });
  const sum = (f: (r: RunSizingRow) => number): number => rows.reduce((a, r) => a + f(r), 0);
  return {
    rows, runFte: spreadOf(rows.map((r) => r.runFte)), opsPerAgent: spreadOf(rows.map((r) => r.opsPerAgent)), floorMin: spreadOf(rows.map((r) => r.floorMin)),
    totals: { runFte: sum((r) => r.runFte), runCost: sum((r) => r.runCost), supervisionFte: sum((r) => r.supervisionFte) },
  };
}
