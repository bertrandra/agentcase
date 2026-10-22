/** @calc-zone aggregate-views */
import { roiCanonical } from '../economics/roi';
import { evaluateStrategies, stratNormalize, strategyDefsOf, stratWeightsOf } from '../verdict';
import { selectionOf, total } from './aggEconomicsSel';
import type { Consolidated } from './consolidate';
import type { DisplayScope } from './portfolioHeadline';
import type { ProductRun } from './run';
import { selectionView } from './selectionView';
import type { Portfolio } from './types';

/** The strategy a product's own comparison ranks first (weighted score), with the figures it computes for it. */
export interface StrategyPick { strategyId: string; icon: string; label: string; score: number; roi: number | null; tco: number; net: number; setup: number; payback: number | null }
export interface StrategyRow extends StrategyPick { id: string; name: string; wave: string }
export interface StrategyAgg {
  label: string;
  rows: StrategyRow[];
  /** the roll-up line: net, TCO and setup of the recommended strategies added up, ROI from the summed net and setup */
  totals: { tco: number; net: number; setup: number; roi: number | null };
  /** how many products each strategy is recommended for, most first */
  mix: { id: string; label: string; count: number }[];
  excluded: { id: string; name: string; archived: boolean }[];
}

const cache = new WeakMap<ProductRun, StrategyPick | null>();
/** The recommended strategy of a product: `evaluateStrategies` then `stratNormalize` with the product's own strategy definitions and weights (the section's ranking). */
export function pickStrategy(r: ProductRun): StrategyPick | null {
  if (cache.has(r)) return cache.get(r) ?? null;
  const s = r.ctx.s, top = stratNormalize(evaluateStrategies(r.ctx, strategyDefsOf(s)), stratWeightsOf(s))[0];
  const pick = top ? { strategyId: top.id, icon: top.icon, label: top.label, score: top.score, ...top.row.computed } : null;
  cache.set(r, pick);
  return pick;
}

/** Strategy comparison of a Portfolio / Wave: each product's recommended delivery strategy and its ROI / TCO, and the roll-up of those recommendations. */
export function aggregateStrategies(pf: Portfolio, c: Consolidated, scope: DisplayScope): StrategyAgg | null {
  const sel = selectionOf(c, scope);
  if (!sel) return null;
  const rows = sel.items.flatMap((v): StrategyRow[] => {
    const p = pickStrategy(v.run);
    return p ? [{ ...p, id: v.id, name: v.name, wave: pf.waves.find((w) => w.id === v.waveId)?.name ?? '' }] : [];
  });
  const net = total(rows.map((r) => r.net)), setup = total(rows.map((r) => r.setup)), ids = [...new Set(rows.map((r) => r.strategyId))];
  const mix = ids.map((id) => ({ id, label: rows.find((r) => r.strategyId === id)?.label ?? id, count: rows.filter((r) => r.strategyId === id).length })).sort((a, b) => b.count - a.count);
  return { label: sel.label, rows, mix, totals: { tco: total(rows.map((r) => r.tco)), net, setup, roi: roiCanonical(net, setup) }, excluded: selectionView(pf, c, scope)?.excluded ?? [] };
}
