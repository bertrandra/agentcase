/** @calc-zone aggregate-views */
import { modelRaw } from '../model/raw';
import { scenarioDefs, scenarioEngine, type Scenario } from '../stress';
import { paybackShown } from '../stress/scenarioView';
import { consolidate } from './consolidate';
import { summarize, type Summary } from './headline';
import { memoChain } from './memo';
import type { ProductRun } from './run';
import { productSeries, type ProductSeries, type SeriesSource } from './series';
import type { Portfolio } from './types';
import { aggregate, type ProductView } from './waves';

/**
 * Portfolio scenarios (DEV-PF-GAPS closed): each of the six scenarios run on every product's effective case (`scenarioEngine`, the product view's own
 * engine), laid on the calendar by the consolidation kernel (`productSeries`: shifted by the product's month 0, KT lead, truncated at the portfolio
 * horizon) and summed by `aggregate` / `summarize`, exactly as the deterministic consolidation sums the main case (F16). No formula of its own.
 */

/** The money figures of one scenario for a set of products on the calendar; `payback` is the shown month (0 = immediate, null = not within horizon). */
export interface ScenarioFigures { setup: number; totBen: number; net: number; npv: number; roi: number | null; payback: number | null }
export interface PfScenarioProduct { id: string; name: string; month0: number; figures: ScenarioFigures }
export interface PfScenarioRow { key: Scenario['key']; label: string; figures: ScenarioFigures; products: PfScenarioProduct[] }
/** The same figures product by product: `cells[k]` is the product's part of `rows[k]` (the breakdown table reads it). */
export interface PfScenarioByProduct { id: string; name: string; month0: number; cells: ScenarioFigures[] }
export interface PfScenarios { horizon: number; rate: number; rows: PfScenarioRow[]; byProduct: PfScenarioByProduct[] }

interface ScenarioRun { key: Scenario['key']; label: string; src: SeriesSource }

/** Label of a scenario when the products' own labels differ (their destination or ramp rate are overridden). */
const GENERIC: Record<Scenario['key'], string> = { asis: 'AS-IS', ai: 'AI only', loc: 'Location only', ramp: 'Ramp (each product’s destination)',
  ailoc: 'AI + Location', aidst: 'AI + 100% destination (each product’s)' };

const ALL_KEYS = Object.keys(GENERIC) as Scenario['key'][];

const runsMemo = new WeakMap<ProductRun, ScenarioRun[]>();
/**
 * The six scenario engines of one product, memoised on its run (one per resolved case): moving a product in time, or editing another one, never rebuilds
 * them. A scenario without a programme has no setup, so its KT part is zero as well.
 */
export function scenarioRuns(run: ProductRun): ScenarioRun[] {
  let out = runsMemo.get(run);
  if (out) return out;
  const raw = modelRaw(run.ctx);
  out = scenarioDefs(run.ctx).map((d) => {
    const e = scenarioEngine(run.ctx, d.opts, raw), K = e.K;
    const src = { rows: e.months(), baseEtp: K.baseEtp, ktSetup: K.setupTotal > 0 ? run.ktSetup : 0, profile: K.setupProfileMonths };
    return { key: d.key, label: d.label, src };
  });
  runsMemo.set(run, out);
  return out;
}

const figures = (s: Summary): ScenarioFigures => ({ setup: s.setup, totBen: s.totalBenefit, net: s.net, npv: s.npv, roi: s.roi,
  payback: paybackShown({ setup: s.setup, totBen: s.totalBenefit, pbMonth: s.paybackMonth }) });

function build(views: ProductView[], horizon: number, rate: number): PfScenarios {
  const per = views.map((v) => ({ v, runs: scenarioRuns(v.run) }));
  const keys = per[0]?.runs.map((r) => r.key) ?? ALL_KEYS;
  const rows = keys.map((key, k): PfScenarioRow => {
    const items = per.map(({ v, runs }) => {
      const r = runs[k] as ScenarioRun, series: ProductSeries = productSeries(r.src, v, horizon);
      return { series, label: r.label, product: { id: v.id, name: v.name, month0: v.month0, figures: figures(summarize(series, series.first, rate)) } };
    });
    const labels = new Set(items.map((i) => i.label)), label = labels.size === 1 ? (items[0] as (typeof items)[number]).label : GENERIC[key];
    return { key, label, figures: figures(aggregate(items, horizon, rate).summary), products: items.map((i) => i.product) };
  });
  const byProduct = views.map((v, i) => ({ id: v.id, name: v.name, month0: v.month0, cells: rows.map((r) => (r.products[i] as PfScenarioProduct).figures) }));
  return { horizon, rate, rows, byProduct };
}
const memo = new WeakMap<object, unknown>();
/**
 * The six scenarios of the selection (`ids`: the products of the View; unplanned or unknown ids are left out, as in the consolidation), summed on the
 * portfolio calendar with the common discount rate. Memoised on the consolidation and the selection.
 */
export function portfolioScenarios(pf: Portfolio, ids: string[]): PfScenarios {
  const cons = consolidate(pf);
  return memoChain(memo, [cons], ids.join('|'), () => {
    const want = new Set(ids);
    return build(cons.products.filter((v) => want.has(v.id)), cons.horizon, cons.rate);
  });
}
