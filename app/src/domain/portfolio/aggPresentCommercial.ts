/** @calc-zone aggregate-views */
import { CM_CODES, cmRecommend, commercialView, type CmCode, type CmRow } from '../pdc/commercial';
import { selectionOf, total } from './aggEconomicsSel';
import type { Consolidated } from './consolidate';
import type { DisplayScope } from './portfolioHeadline';
import type { ProductRun } from './run';
import { selectionView } from './selectionView';
import type { Portfolio } from './types';

export interface CommercialRow { id: string; name: string; wave: string; horizon: number; selected: CmCode; recommended: CmCode; row: CmRow }
export interface CommercialAgg {
  label: string;
  rows: CommercialRow[];
  /**
   * the roll-up line: the contracts of the products (each under its own selected model, over its own horizon) added up; the margin % is from the
   * sums. The gain share is not linear: no figure is derived from a summed input
   */
  totals: { revenue: number; cost: number; margin: number; marginPct: number; tco: number; unavailable: number };
  excluded: { id: string; name: string; archived: boolean }[];
}

const cache = new WeakMap<ProductRun, { selected: CmCode; recommended: CmCode; row: CmRow; horizon: number }>();
/** A product's commercial view, read on the model it selected (`cmModel`, default Effort & Tools), memoised on its run. */
function commercialOf(r: ProductRun) {
  let m = cache.get(r);
  if (!m) {
    const v = commercialView(r.ctx), code = (r.ctx.inp.v('cmModel') || 'ET') as CmCode, selected = CM_CODES.includes(code) ? code : 'ET';
    m = { selected, recommended: cmRecommend(r.ctx)[0], row: v.rows.find((x) => x.code === selected) as CmRow, horizon: v.horizon };
    cache.set(r, m);
  }
  return m;
}

/** Commercial model of a Portfolio / Wave: the model each product sells under, its revenue, margin and client saving, and the roll-up of those contracts. */
export function aggregateCommercial(pf: Portfolio, c: Consolidated, scope: DisplayScope): CommercialAgg | null {
  const sel = selectionOf(c, scope);
  if (!sel) return null;
  const rows = sel.items.map((v): CommercialRow => ({ id: v.id, name: v.name, wave: pf.waves.find((w) => w.id === v.waveId)?.name ?? '',
    ...commercialOf(v.run) }));
  const ok = rows.filter((r) => r.row.available), revenue = total(ok.map((r) => r.row.revenue)), margin = total(ok.map((r) => r.row.margin));
  return {
    label: sel.label, rows, excluded: selectionView(pf, c, scope)?.excluded ?? [],
    totals: { revenue, cost: total(ok.map((r) => r.row.cost)), margin, marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
    tco: total(ok.map((r) => r.row.tco)), unavailable: rows.length - ok.length },
  };
}
