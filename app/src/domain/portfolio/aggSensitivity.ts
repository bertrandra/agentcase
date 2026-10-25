/** @calc-zone aggregate-views */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { khSetupCost } from '../knowledge';
import { movedCtx, rankTornado, TORNADO_DEFAULT_STEP, TORNADO_DRIVERS, type TornadoFigures, type TornadoRow } from '../stress';
import { consolidate } from './consolidate';
import { summarize, type Summary } from './headline';
import { memoChain } from './memo';
import type { ProductRun } from './run';
import { productSeries, type SeriesSource } from './series';
import type { Portfolio } from './types';
import { aggregate, type ProductView } from './waves';

/**
 * Portfolio sensitivity (DEV-PF-GAPS closed): each tornado driver moved by the same relative step on every product of the selection, each product
 * rerun on its effective case (`movedCtx`, the product tornado's own moved case), laid on the calendar by the consolidation kernel (`productSeries`)
 * and summed by `aggregate` / `summarize`, exactly like the portfolio scenarios. No formula of its own.
 */
export interface PfTornadoProduct { id: string; name: string; month0: number; down: TornadoFigures; up: TornadoFigures }
/** A driver of the selection: each product moves its own value by the step, so the row carries no single driver value. */
export type PfTornadoRow = Omit<TornadoRow, 'value' | 'low' | 'high'> & { products: PfTornadoProduct[] };
export interface PfTornado { step: number; horizon: number; rate: number; base: TornadoFigures; rows: PfTornadoRow[] }

interface DriverRun { id: string; down: SeriesSource; up: SeriesSource }

/** What the calendar layout reads of a moved case: its engine's months, entry headcount and KT part of the setup (as `runOf` builds them). */
function sourceOf(c: Ctx): SeriesSource {
  const e = engineNow(c), K = e.K;
  return { rows: e.months(), baseEtp: K.baseEtp, ktSetup: khSetupCost(c), profile: K.setupProfileMonths };
}

const runsMemo = new WeakMap<object, unknown>();
/** The moved cases of one product for a step, memoised on its run: moving a product in time, or editing another one, never reruns them. */
export const sensitivityRuns = (run: ProductRun, step: number): DriverRun[] => memoChain(runsMemo, [run], String(step), () =>
  TORNADO_DRIVERS.map((d) => ({ id: d.id, down: sourceOf(movedCtx(run.ctx, d, -1, step)), up: sourceOf(movedCtx(run.ctx, d, 1, step)) })));

const fig = (s: Summary): TornadoFigures => ({ net: s.net, npv: s.npv });

function build(views: ProductView[], horizon: number, rate: number, step: number): PfTornado {
  const per = views.map((v) => ({ v, runs: sensitivityRuns(v.run, step) }));
  const side = (k: number, pick: (r: DriverRun) => SeriesSource) => {
    const items = per.map(({ v, runs }) => ({ series: productSeries(pick(runs[k] as DriverRun), v, horizon) }));
    return { total: fig(aggregate(items, horizon, rate).summary), parts: items.map(({ series: s }) => fig(summarize(s, s.first, rate))) };
  };
  const rows = TORNADO_DRIVERS.map((d, k): PfTornadoRow => {
    const down = side(k, (r) => r.down), up = side(k, (r) => r.up);
    return { id: d.id, label: d.label, down: down.total, up: up.total, swing: Math.abs(up.total.net - down.total.net),
      products: views.map((v, i) => ({ id: v.id, name: v.name, month0: v.month0, down: down.parts[i] as TornadoFigures, up: up.parts[i] as TornadoFigures })) };
  });
  return { step, horizon, rate, base: fig(aggregate(views, horizon, rate).summary), rows: rankTornado(rows) };
}

const memo = new WeakMap<object, unknown>();
/**
 * The tornado of the selection (`ids`: the products of the View; unplanned or unknown ids left out, as in the consolidation), on the portfolio
 * calendar with the common discount rate. Memoised on the consolidation, the selection and the step.
 */
export function portfolioSensitivity(pf: Portfolio, ids: string[], step: number = TORNADO_DEFAULT_STEP): PfTornado {
  const cons = consolidate(pf);
  return memoChain(memo, [cons], `${step}|${ids.join('|')}`, () => {
    const want = new Set(ids);
    return build(cons.products.filter((v) => want.has(v.id)), cons.horizon, cons.rate, step);
  });
}
