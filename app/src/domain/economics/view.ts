import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { engineNow } from '../canonical';
import { headline } from './headline';
import type { YearRow } from '../time/years';
import type { ModelResult } from '../types/model';
import type { Engine } from '../time';
import { monthlySeries, type MonthlyRow } from './monthlySeries';

/** Everything the money views read, computed once per case from the live Time Engine. */
export interface EconomicsView {
  m: ModelResult; eng: Engine; years: YearRow[]; months: MonthlyRow[];
  /** horizon in years (= years.length) */
  H: number;
  setup: number; baselineRun: number; baseFte: number;
  /** sum of savings over the horizon */
  totalBenefit: number;
  /** total savings minus setup */
  net: number;
  /** net ROI as a ratio, null when nothing was invested */
  roi: number | null;
  /** canonical payback month (1-based) or null */
  payback: number | null;
  /** case discount rate and the NPV at that rate */
  npvRate: number; npv: number;
  /** human FTE freed at each year end: max(0, base - residual) */
  freed: number[];
  /** cumulative cash-flow at each year end (starts from -setup) */
  cumulative: number[];
}

/** Aggregate of the Time Engine + model() for the Financial, Run, Annual and Monthly sections. */
export function economicsView(c: Ctx): EconomicsView {
  const m = model(c), eng = engineNow(c), years = eng.years(), H = years.length;
  const h = headline(c), setup = m.setupTotal, { totalBenefit, net, npvRate } = h;
  let cum = -setup;
  return {
    m, eng, years, months: monthlySeries(eng), H, setup, baselineRun: m.baselineRun, baseFte: m.base.etp, totalBenefit, net, roi: h.roi,
    payback: h.paybackMonth, npvRate, npv: h.npv,
    freed: years.map((y) => Math.max(0, m.base.etp - y.humanFteEnd)), cumulative: years.map((y) => (cum += y.savings)),
  };
}
