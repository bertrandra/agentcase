/** @calc-zone economics-headline @owner total-benefit, net, payback-year */
import { caseDiscountRate, engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import type { Engine } from '../time';
import { displayedPayback } from './cashflow';

/**
 * The case's money headline, derived once from the Time Engine rows (payback, NPV and ROI by the cash-flow kernel): every screen that prints net,
 * ROI, payback or NPV reads this.
 */
export interface Headline {
  /** sum of savings over the horizon */
  totalBenefit: number;
  /** setup total of the engine's frozen inputs */
  setup: number;
  /** the engine's net cash-flow over the horizon (`eng.total()`): totalBenefit minus the setup spread inside the horizon */
  net: number;
  /** net / setup, null when nothing was invested or the net is not finite (see `roiCanonical`) */
  roi: number | null;
  /** payback month of the cash-flow kernel (`paybackMonthOf`: the cumulative stays >= 0 from it to the horizon end), null when not reached */
  paybackMonth: number | null;
  /** horizon year that contains the payback month = ceil(month / 12) */
  paybackYear: number | null;
  /** NPV of the monthly cash-flow at the case discount rate */
  npv: number;
  npvRate: number;
}

/** Horizon year (1-based) that contains a payback month. */
export const paybackYearOf = (month: number | null): number | null => (month == null ? null : Math.max(1, Math.ceil(month / 12)));

/**
 * Headline of an engine (the live case's, or a scenario's): the engine's own totals. Net = `eng.total()` (the monthly net cash-flow over the horizon,
 * = savings minus the setup spread inside it), ROI = `eng.roi()`, payback = the engine's monthly crossing, NPV at the case rate.
 */
export function headlineOf(eng: Engine, c: Ctx): Headline {
  const setup = eng.K.setupTotal, npvRate = caseDiscountRate(c), paybackMonth = eng.payback();
  const totalBenefit = eng.years().reduce((a, y) => a + y.savings, 0);
  return { totalBenefit, setup, net: eng.total(), roi: eng.roi(), paybackMonth, paybackYear: paybackYearOf(paybackMonth), npv: eng.npv(npvRate), npvRate };
}

/** Headline of the live case. */
export const headline = (c: Ctx): Headline => headlineOf(engineNow(c), c);

/** The displayed payback year (`displayedPayback`): 0 = immediate (no setup and positive savings), else the year of the payback month, null if not reached. */
export function paybackYearShown(h: Pick<Headline, 'paybackMonth' | 'setup' | 'totalBenefit'>): number | null {
  const m = displayedPayback(h.paybackMonth, h.setup, h.totalBenefit);
  return m === 0 ? 0 : paybackYearOf(m);
}
