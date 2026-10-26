/** @calc-zone economics-headline */
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { engineNow } from '../canonical';
import { displayedPayback } from './cashflow';
import { avg, yearSeries, type YearSeries } from './financial';
import { fteBeforeAfter, humanFteOfYear, type FteBeforeAfter } from './fte';
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
  /** setup total (the headline's: the engine's frozen inputs, = `setupBreakdown(c).total`) */
  setup: number; baselineRun: number; baseFte: number;
  /** sum of savings over the horizon */
  totalBenefit: number;
  /** total savings minus setup */
  net: number;
  /** net ROI as a ratio, null when nothing was invested */
  roi: number | null;
  /** canonical payback month (1-based, the cash-flow kernel) or null */
  payback: number | null;
  /** the payback a screen prints (`displayedPayback`): the kernel month, 0 = immediate when there is no setup, null = not within the horizon */
  paybackShown: number | null;
  /** case discount rate and the NPV at that rate */
  npvRate: number; npv: number;
  /** FTE before / after at each year end (`fteBeforeAfter`: human = delivery + agentic run team) and at the horizon end */
  fteYears: FteBeforeAfter[]; fte: FteBeforeAfter;
  /** human FTE freed at each year end (`fteYears[i].freed`) */
  freed: number[];
  /** cumulative cash-flow at each year end (the engine's `cumulativeCashFlowEnd`) */
  cumulative: number[];
  /** per-year net cash-flow after the setup spent in that year (the engine's `netAfterSetup`; they sum to `net`) */
  yearNet: number[];
  /** per-year cost = run cost + the setup spent in that year */
  yearCost: number[];
  /** per-year run cost minus the AS-IS baseline run (= −savings when no other effect applies) */
  runDelta: number[];
  /** per-year human workforce + token cost (the workforce-shift table) */
  humanAgentCost: number[];
  /** the per-year columns and their horizon averages */
  series: YearSeries; avgOf: Record<keyof YearSeries, number>;
  /** sum of the run cost over the horizon */
  totalRun: number;
}

const averages = (s: YearSeries): Record<keyof YearSeries, number> =>
  Object.fromEntries(Object.entries(s).map(([k, a]) => [k, avg(a)])) as Record<keyof YearSeries, number>;

/** Aggregate of the Time Engine + model() for the Financial, Run, Annual and Monthly sections. */
export function economicsView(c: Ctx): EconomicsView {
  const m = model(c), eng = engineNow(c), years = eng.years(), H = years.length;
  const h = headline(c), setup = h.setup, { totalBenefit, net, npvRate } = h, series = yearSeries(years);
  const fteYears = years.map((y) => fteBeforeAfter(m.base.etp, humanFteOfYear(y)));
  return {
    m, eng, years, months: monthlySeries(eng), H, setup, baselineRun: m.baselineRun, baseFte: m.base.etp, totalBenefit, net, roi: h.roi,
    payback: h.paybackMonth, paybackShown: displayedPayback(h.paybackMonth, setup, totalBenefit), npvRate, npv: h.npv,
    fteYears, fte: fteYears[H - 1] ?? fteBeforeAfter(m.base.etp, m.base.etp), freed: fteYears.map((f) => f.freed),
    cumulative: years.map((y) => y.cumulativeCashFlowEnd), yearNet: years.map((y) => y.netAfterSetup), yearCost: years.map((y) => y.totalRunCost + y.setupCost),
    runDelta: years.map((y) => y.totalRunCost - m.baselineRun), humanAgentCost: years.map((y) => y.teamCost + y.tokenCost),
    series, avgOf: averages(series), totalRun: years.reduce((a, y) => a + y.totalRunCost, 0),
  };
}
