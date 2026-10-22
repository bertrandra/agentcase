/** @calc-zone portfolio-consolidation */
import { summarize, type Summary } from './headline';
import type { ProductRun } from './run';
import { addInto, emptySeries, type ProductSeries, type Series } from './series';
import type { Scheduled } from './timeline';
import type { Portfolio } from './types';

/** A planned product with its calendar series and its own figures. */
export interface ProductView {
  id: string;
  name: string;
  waveId: string;
  month0: number;
  /** months the KT setup is placed before month0 */
  lead: number;
  run: ProductRun;
  series: ProductSeries;
  /** calendar view: NPV discounted from portfolio month 1, so the sum over products is the portfolio NPV (D-M4) */
  summary: Summary;
}

export interface WaveView {
  id: string;
  name: string;
  startMonth: number;
  /** planned products of the wave, in portfolio order */
  productIds: string[];
  series: Series;
  summary: Summary;
}

/** Sum a set of product series and read its headline. An empty set gives zero flows and no payback. */
export function aggregate(items: ProductView[], horizon: number, rate: number): { series: Series; summary: Summary } {
  const series = emptySeries(horizon);
  for (const v of items) addInto(series, v.series);
  const first = items.length ? Math.min(...items.map((v) => v.series.first)) : horizon + 1;
  return { series, summary: summarize(series, first, rate) };
}

/** Per-wave aggregates in wave order; the products are those the consolidation planned (see `scheduledProducts`). */
export function waveViews(pf: Portfolio, products: ProductView[], horizon: number, rate: number): WaveView[] {
  return pf.waves.map((w) => {
    const mine = products.filter((v) => v.waveId === w.id);
    return { id: w.id, name: w.name, startMonth: w.startMonth, productIds: mine.map((v) => v.id), ...aggregate(mine, horizon, rate) };
  });
}

export function productView(s: Scheduled, run: ProductRun, series: ProductSeries, rate: number): ProductView {
  return { id: s.product.id, name: s.product.name, waveId: s.wave.id, month0: s.month0, lead: s.lead, run, series, summary: summarize(series, series.first, rate) };
}
