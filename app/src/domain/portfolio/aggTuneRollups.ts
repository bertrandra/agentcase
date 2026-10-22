/** @calc-zone aggregate-views */
import type { Ctx } from '../ctx';
import {
  ELIG_PREREQS, NATURE_LABEL, abaqueRows, blankReadiness, eligLoc, eligNature, eligState, eligVerdict, hriSummary, opModelView, pillarKey, profileById, readinessBand, readinessIndex,
  weakestDims, type EligVerdict, type ReadinessAns,
} from '../tune';
import { tokenUsage } from '../tuneB/tokens';
import { consolidate } from './consolidate';
import { headOf, membersOf, spreadOf, type Head, type Spread } from './aggTuneCore';
import type { Portfolio } from './types';

const total = <T>(rows: T[], f: (r: T) => number): number => rows.reduce((a, r) => a + f(r), 0);

// ---- AI Readiness --------------------------------------------------------------------------------------------------------------------------------
export interface ReadinessRow extends Head { index: number | null; band: string; answered: number; weakest: string | null; hri: number; hriLabel: string; hriOn: boolean }
export interface ReadinessAgg { rows: ReadinessRow[]; assessed: number; index: Spread; hri: Spread; band: string }

/** Readiness index (0-100), band, weakest dimension and Human Readiness of each product. The roll-up line is the mean over the assessed products (the index is not additive). */
export function aggReadiness(pf: Portfolio, productIds: string[]): ReadinessAgg {
  const rows = membersOf(pf, productIds).map((m): ReadinessRow => {
    const ans: ReadinessAns = (m.state as { readinessAns?: ReadinessAns }).readinessAns ?? blankReadiness(), idx = readinessIndex(ans), h = hriSummary(m.ctx);
    return {
      ...headOf(m), index: idx, band: readinessBand(idx).label, answered: Object.values(ans).flat().filter((v) => v != null).length, weakest: weakestDims(ans, 1),
      hri: h.index, hriLabel: h.label, hriOn: h.on,
    };
  });
  const scored = rows.flatMap((r) => (r.index == null ? [] : [r.index])), index = spreadOf(scored);
  return { rows, assessed: scored.length, index, hri: spreadOf(rows.filter((r) => r.hriOn).map((r) => r.hri)), band: readinessBand(scored.length ? index.avg : null).label };
}

// ---- Token economics -----------------------------------------------------------------------------------------------------------------------------
export interface TokenRow extends Head { endLabel: string; runs: number; tokensM: number; blended: number; costEnd: number; horizonCost: number }
export interface TokenAgg { rows: TokenRow[]; models: { name: string; mix: number; priceIn: number; priceOut: number }[]; totals: { horizonCost: number }; cost: Spread }

/** Agent runs, tokens and token cost of each product (end of its horizon, plus its whole horizon on the calendar axis); the total is the consolidation's `token` series of the selection. */
export function aggTokens(pf: Portfolio, productIds: string[]): TokenAgg {
  const c = consolidate(pf), ms = membersOf(pf, productIds);
  const horizonOf = (id: string): number => c.products.find((v) => v.id === id)?.series.token.reduce((a, x) => a + x, 0) ?? 0;
  const rows = ms.map((m): TokenRow => {
    const u = tokenUsage(m.ctx);
    return { ...headOf(m), endLabel: u.endLabel, runs: u.runsY3, tokensM: u.y3, blended: u.blended, costEnd: u.costY3, horizonCost: horizonOf(m.id) };
  });
  const sel = new Set(rows.map((r) => r.id)), horizonCost = c.products.filter((v) => sel.has(v.id)).reduce((a, v) => a + v.series.token.reduce((x, y) => x + y, 0), 0);
  return { rows, models: pf.common.TOKEN_MODELS.map((x) => ({ name: x.name, mix: x.mix, priceIn: x.priceIn, priceOut: x.priceOut })), totals: { horizonCost }, cost: spreadOf(rows.map((r) => r.horizonCost)) };
}

// ---- Operating model -----------------------------------------------------------------------------------------------------------------------------
export interface OpModelRow extends Head {
  endLabel: string; podSize: number; widened: boolean; level: number; ok: boolean;
  y1: { pods: number; residual: number; ops: number; total: number }; yN: { pods: number; residual: number; ops: number; total: number };
}
export interface OpModelAgg { rows: OpModelRow[]; totals: { y1: OpModelRow['y1']; yN: OpModelRow['yN']; ok: number; ko: number } }

/** Pods, residual team, run team and V7 conservation check of each product, at Y1 and at the end of its own horizon; the total line adds the products' figures. */
export function aggOpModel(pf: Portfolio, productIds: string[]): OpModelAgg {
  const rows = membersOf(pf, productIds).map((m): OpModelRow => {
    const v = opModelView(m.ctx), pick = (t: typeof v.y1) => ({ pods: t.pods, residual: t.residual, ops: t.ops, total: t.total });
    return { ...headOf(m), endLabel: v.endLabel, podSize: v.y1.pod, widened: v.y1.widened || v.yN.widened, level: v.y1.lvl, ok: v.ok, y1: pick(v.y1), yN: pick(v.yN) };
  });
  const sum = (k: 'y1' | 'yN') => ({ pods: total(rows, (r) => r[k].pods), residual: total(rows, (r) => r[k].residual), ops: total(rows, (r) => r[k].ops), total: total(rows, (r) => r[k].total) });
  return { rows, totals: { y1: sum('y1'), yN: sum('yN'), ok: rows.filter((r) => r.ok).length, ko: rows.filter((r) => !r.ok).length } };
}

// ---- Eligibility & Abaques -----------------------------------------------------------------------------------------------------------------------
export interface EligibilityRow extends Head {
  verdict: EligVerdict['verdict']; unmetCrit: number; partial: number; met: number; loc: number; nature: string; profile: string; level: number; vTaxRate: number; notes: string[];
}
export interface EligibilityAgg { rows: EligibilityRow[]; totals: { go: number; conditional: number; noGo: number } }

const prereqMet = (c: Ctx): number => ELIG_PREREQS.filter((p) => eligState(c, p.id) === 'met').length;

/** The go / conditional / no-go gate of each product with its prerequisites, codebase size, nature, profile and verification tax; the total line counts the verdicts. */
export function aggEligibility(pf: Portfolio, productIds: string[]): EligibilityAgg {
  const rows = membersOf(pf, productIds).map((m): EligibilityRow => {
    const v = eligVerdict(m.ctx), a = abaqueRows(m.ctx), nature = eligNature(m.ctx);
    return {
      ...headOf(m), verdict: v.verdict, unmetCrit: v.unmetCrit, partial: v.partial, met: prereqMet(m.ctx), loc: eligLoc(m.ctx), nature: NATURE_LABEL[nature] ?? nature,
      profile: profileById(pillarKey(m.ctx)).label, level: a.lvl, vTaxRate: a.vTaxRate, notes: v.notes,
    };
  });
  const n = (v: EligVerdict['verdict']) => rows.filter((r) => r.verdict === v).length;
  return { rows, totals: { go: n('go'), conditional: n('conditional'), noGo: n('no-go') } };
}
