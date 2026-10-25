/** @calc-zone aggregate-views */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { compareData, scenarioSet, sensitivityMatrix, sensitivityRows, type SensRow } from '../stress';
import { paybackShown } from '../stress/scenarioView';
import { ctxOf } from './memo';
import { resolveProduct } from './resolve';
import type { Diversification, PfStress, ProductStress, StressStats, WaveStress } from './stressTypes';
import type { VerdictGroup } from './stressVerdict';
import type { Portfolio } from './types';

/** The identity of a product line of an aggregate view of the "stress", "model-engine" and "defend" groups. */
export interface AggProduct { id: string; name: string; wave: string }

/** The product's effective case as a Ctx (the very one the consolidation and the product view use). */
export const productCtx = (pf: Portfolio, id: string): Ctx => ctxOf(resolveProduct(pf, id));

/** One line per requested product (unknown ids ignored), in the order asked, with what `f` reads from its effective case. */
export function perProduct<R>(pf: Portfolio, ids: string[], f: (c: Ctx, p: AggProduct) => R): (AggProduct & R)[] {
  const out: (AggProduct & R)[] = [];
  for (const id of ids) {
    const p = pf.products.find((x) => x.id === id);
    if (!p) continue;
    const who = { id, name: p.name, wave: pf.waves.find((w) => w.id === p.waveId)?.name ?? '' };
    out.push({ ...who, ...f(productCtx(pf, id), who) });
  }
  return out;
}

/** --- Monte Carlo: the portfolio Monte Carlo (P6) restricted to the selection --- */
export interface SelectionStress {
  label: string;
  stats: StressStats;
  products: ProductStress[];
  waves: WaveStress[];
  /** risk reduction on the downside (P10) of the selection: its P10 minus the sum of its products' stand-alone P10 */
  diversification: Diversification;
  /** sorted net-benefit draws: only the portfolio run keeps them (null for a wave) */
  outcomes: number[] | null;
}

/** The last portfolio run read for a Portfolio or a Wave; null when the wave has no product in the run. */
export function selectionStress(run: PfStress, group: VerdictGroup): SelectionStress | null {
  if (group.kind === 'portfolio') return { label: 'Portfolio', stats: run.stats, products: run.products, waves: run.waves,
    diversification: run.diversification, outcomes: run.outcomes };
  const wave = run.waves.find((w) => w.id === group.id), products = run.products.filter((p) => p.waveId === group.id);
  if (!wave || !products.length) return null;
  const sumP10 = products.reduce((a, p) => a + p.stats.p10, 0);
  return { label: wave.name, stats: wave.stats, products, waves: [wave], diversification: { sumP10, p10: wave.stats.p10, reduction: wave.stats.p10 - sumP10 },
    outcomes: null };
}

/** --- Scenarios: the six strategies priced for each product (scenarioSet of the product's own case) --- */
export interface ScenarioCell { key: string; label: string; setup: number; totBen: number; net: number; roi: number | null; payback: number | null;
  horizon: number }
export type ScenarioProductRow = AggProduct & { horizon: number; cells: ScenarioCell[] };

export function scenarioByProduct(pf: Portfolio, ids: string[]): ScenarioProductRow[] {
  return perProduct(pf, ids, (c) => {
    const set = scenarioSet(c);
    return {
      horizon: (set[0] as (typeof set)[number]).m.horizon,
      cells: set.map((s) => ({ key: s.key, label: s.label, setup: s.m.setup, totBen: s.m.totBen, net: s.m.totBen - s.m.setup, roi: s.m.roi ?? null,
      payback: paybackShown(s.m), horizon: s.m.horizon })),
    };
  });
}

/** --- 3-way comparison: AS-IS / AS-IS + classic saving / Agentic at the end of each product's horizon --- */
export interface CompareFigures { asisFte: number; classicFte: number; agenticFte: number; vfte: number; asisCost: number; classicCost: number;
  agenticCost: number; classicSave: number; agenticSave: number }
export type CompareProductRow = AggProduct & CompareFigures & { horizon: number; classicSaving: number };

export function compareByProduct(pf: Portfolio, ids: string[]): { rows: CompareProductRow[]; totals: CompareFigures } {
  const rows = perProduct(pf, ids, (c) => {
    const d = compareData(c), last = d.labels.length - 1, ey = engineNow(c).years(), e = ey[Math.min(last, ey.length - 1)];
    return {
      horizon: d.labels.length, classicSaving: d.classicSaving, asisFte: d.asis.fte[last] as number, classicFte: d.classic.fte[last] as number,
      agenticFte: d.agentic.fte[last] as number,
      vfte: e?.agentVfteEnd ?? 0, asisCost: d.asis.cost[last] as number, classicCost: d.classic.cost[last] as number, agenticCost: e?.totalRunCost ?? 0,
      classicSave: d.classic.save[last] as number, agenticSave: d.agentic.save[last] as number,
    };
  });
  const sum = (k: keyof CompareFigures): number => rows.reduce((a, r) => a + r[k], 0);
  return {
    rows,
    totals: { asisFte: sum('asisFte'), classicFte: sum('classicFte'), agenticFte: sum('agenticFte'), vfte: sum('vfte'), asisCost: sum('asisCost'),
    classicCost: sum('classicCost'),
      agenticCost: sum('agenticCost'), classicSave: sum('classicSave'), agenticSave: sum('agenticSave') },
  };
}

/** --- Sensitivity: the six key parameters and the span of the automation x glass-ceiling ROI matrix, per product --- */
export type SensProductRow = AggProduct & { params: SensRow[]; most: SensRow; roiLow: number | null; roiHigh: number | null; negative: number; cells: number };

export function sensitivityByProduct(pf: Portfolio, ids: string[]): SensProductRow[] {
  return perProduct(pf, ids, (c) => {
    const params = sensitivityRows(c), rois = sensitivityMatrix(c).cells.flat().flatMap((x) => (x.roi == null ? [] : [x.roi]));
    return { params, most: params[0] as SensRow, roiLow: rois.length ? Math.min(...rois) : null, roiHigh: rois.length ? Math.max(...rois) : null,
      negative: rois.filter((r) => r < 0).length, cells: rois.length };
  });
}
