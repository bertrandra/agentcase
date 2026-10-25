/** @calc-zone aggregate-views */
import { MP_COST_SP_ASIS, playbackSeries, type PlaybackSeries } from '../pdc/playback';
import { model } from '../model/overlay';
import { selectionOf, lastOf, total } from './aggEconomicsSel';
import { selectionView } from './selectionView';
import type { Consolidated } from './consolidate';
import type { DisplayScope, PortfolioHeadline } from './portfolioHeadline';
import type { ProductRun } from './run';
import type { ProductView } from './waves';
import type { Portfolio } from './types';

const cache = new WeakMap<ProductRun, PlaybackSeries>();
/** A product's own playback (its Time Engine months, index 0 = AS-IS), memoised on its run. */
const playbackOf = (r: ProductRun): PlaybackSeries => { let p = cache.get(r); if (!p) { p = playbackSeries(r.ctx); cache.set(r, p); } return p; };

/** A product's playback value at calendar month T: its AS-IS value before it starts (month0), then its own months, then its last month. */
const at = (a: number[], T: number, month0: number): number => a[Math.min(Math.max(T - month0, 0), a.length - 1)] ?? 0;
/** A ratio metric weighted by each product's entry headcount (the weight of `weightedVelocity`). */
function weighted(items: ProductView[], pick: (p: PlaybackSeries) => number[], T: number): number {
  const w = total(items.map((v) => v.run.baseEtp));
  return w > 0 ? total(items.map((v) => v.run.baseEtp * at(pick(playbackOf(v.run)), T, v.month0))) / w : 0;
}

export interface PlaybackProductRow { id: string; name: string; wave: string; baseEtp: number; etp: number; vfte: number; velocityPct: number; net: number }
export interface PlaybackAgg { label: string; headline: PortfolioHeadline; series: PlaybackSeries; rows: PlaybackProductRow[];
  totals: Omit<PlaybackProductRow, 'id' | 'name' | 'wave'>; excluded: { id: string; name: string; archived: boolean }[] }

/**
 * Monthly Playback of a Portfolio / Wave on the calendar axis, shaped like a product's `PlaybackSeries` (index 0 = AS-IS): FTE, monthly cost and cumulative
 * cash are the consolidated series; velocity and cost per point are the products' own ramps weighted by entry headcount (a product not started yet is AS-IS).
 */
export function aggregatePlayback(pf: Portfolio, c: Consolidated, scope: DisplayScope): PlaybackAgg | null {
  const sel = selectionOf(c, scope);
  if (!sel) return null;
  const s = sel.series, L = s.net.length, T = Array.from({ length: L }, (_, i) => i + 1), h = sel.headline,
    asisRun = total(sel.items.map((v) => model(v.run.ctx).baselineRun)) / 12;
  const withAsis = (asis: number, a: number[]) => [asis, ...a];
  const series: PlaybackSeries = {
    humanFte: withAsis(h.fte.before, s.humanFte), agentVfte: withAsis(0, s.agentVfte),
    teamCost: withAsis(asisRun, s.run),
    tokenCost: withAsis(0, s.token), totalCost: withAsis(asisRun, T.map((_, i) => (s.run[i] ?? 0) + (s.setup[i] ?? 0))),
    netMonth: withAsis(0, s.net), cumulative: withAsis(0, sel.summary.cum),
    ramp: withAsis(0, s.adoptionW.map((w) => (h.fte.before > 0 ? w / h.fte.before : 0))),
    velocity: [0, ...T].map((t) => weighted(sel.items, (p) => p.velocity, t)),
    costPerSp: [0, ...T].map((t) => (sel.items.length ? weighted(sel.items, (p) => p.costPerSp, t) : MP_COST_SP_ASIS)),
    horizon: L / 12, months: L,
  };
  const row = (v: ProductView): PlaybackProductRow => ({ id: v.id, name: v.name, wave: pf.waves.find((w) => w.id === v.waveId)?.name ?? '',
  baseEtp: v.run.baseEtp,
    etp: lastOf(v.series.humanFte), vfte: lastOf(v.series.agentVfte), velocityPct: v.run.velocityPct(), net: v.summary.net });
  return {
    label: sel.label, headline: h, series, rows: sel.items.map(row), excluded: selectionView(pf, c, scope)?.excluded ?? [],
    totals: { baseEtp: h.fte.before, etp: lastOf(s.humanFte), vfte: lastOf(s.agentVfte), velocityPct: h.velocityPct, net: h.net },
  };
}
