import { caseDiscountRate, engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { roiCanonical } from './roi';

/** The case's money headline, derived once from the Time Engine rows: every screen that prints net, ROI, payback or NPV reads this. */
export interface Headline {
  /** sum of savings over the horizon */
  totalBenefit: number;
  /** setup total of the engine's frozen inputs */
  setup: number;
  /** totalBenefit - setup */
  net: number;
  /** net / setup, null when nothing was invested or the net is not finite (see `roiCanonical`) */
  roi: number | null;
  /** first month (1-based) whose cumulative cash-flow is >= 0, null when never reached in the horizon */
  paybackMonth: number | null;
  /** horizon year that contains the payback month = ceil(month / 12) */
  paybackYear: number | null;
  /** NPV of the monthly cash-flow at the case discount rate */
  npv: number;
  npvRate: number;
}

/** Horizon year (1-based) that contains a payback month. */
export const paybackYearOf = (month: number | null): number | null => (month == null ? null : Math.max(1, Math.ceil(month / 12)));

/** Headline of the live case. Net = engine savings over the horizon minus setup; payback is the engine's monthly crossing. */
export function headline(c: Ctx): Headline {
  const eng = engineNow(c), setup = eng.K.setupTotal, npvRate = caseDiscountRate(c);
  const totalBenefit = eng.years().reduce((a, y) => a + y.savings, 0), net = totalBenefit - setup, paybackMonth = eng.payback();
  return { totalBenefit, setup, net, roi: roiCanonical(net, setup), paybackMonth, paybackYear: paybackYearOf(paybackMonth), npv: eng.npv(npvRate), npvRate };
}

/**
 * Payback month from a plain annual savings series (the flat scenario model has no monthly rows): the cumulative cash-flow, starting at
 * -setup, is interpolated linearly inside the year it turns >= 0. Null when never reached. Same "cumulative >= 0" rule as the engine.
 */
export function annualPaybackMonth(setup: number, yearSav: number[]): number | null {
  let cum = -setup;
  for (let y = 0; y < yearSav.length; y++) {
    const prev = cum, sv = yearSav[y] as number;
    cum += sv;
    if (cum >= 0 && sv > 0) return y * 12 + Math.ceil((-prev / sv) * 12);
  }
  return null;
}
