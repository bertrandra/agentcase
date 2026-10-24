/** @calc-zone time-engine @owner payback-month, npv, roi */
/**
 * The discounted-cash-flow kernel: the ONE place where a monthly cash-flow becomes a cumulative, a payback month, an NPV and an ROI.
 * Every caller (the Time Engine, its thin Monte Carlo pass, the portfolio consolidation, the legacy-mode audit and the time-to-market value)
 * hands it a plain array of monthly amounts. Pure, no I/O. Bit-identical to the loops it replaced (`tests/domain/cashflow.test.ts`).
 * It sits in the time-engine zone (the engine computes with it), below the economics headline that reads the engine.
 */

/** The default annual discount rate (8 %): the single literal of the code base; the case value is `caseDiscountRate` (canonical.ts). */
export const DEFAULT_DISCOUNT_RATE = 0.08;

/** `monthly`: month t is discounted by (1 + r/12)^t (the case NPV). `annual`: by (1 + r)^(t/12) (the time-to-market value, P5 flow). */
export type Compounding = 'monthly' | 'annual';

/** The annual rate, or the default when none is given (null / undefined). */
export const rateOr = (annualRate?: number | null): number => (annualRate == null ? DEFAULT_DISCOUNT_RATE : annualRate);

/** Running sum: out[i] = net[0] + ... + net[i], accumulated left to right. */
export function cumulativeOf(net: ArrayLike<number>): number[] {
  const out = new Array<number>(net.length);
  let c = 0;
  for (let i = 0; i < net.length; i++) { c += net[i] as number; out[i] = c; }
  return out;
}

/**
 * Payback month (1-based): the first month t >= `firstMonth` whose cumulative cash-flow (cum[t - 1]) is >= 0, or null when never reached.
 * `firstMonth` > 1 is the portfolio rule: a wave that starts at month 7 cannot "pay back" in month 1 on an all-zero cumulative.
 */
export function paybackMonthOf(cum: ArrayLike<number>, firstMonth = 1): number | null {
  for (let t = Math.max(1, firstMonth); t <= cum.length; t++) if ((cum[t - 1] as number) >= 0) return t;
  return null;
}

/** Discount factor of month t: 1 / (1 + r/12)^t (monthly) or 1 / (1 + r)^(t/12) (annual). */
export const discountFactor = (t: number, annualRate: number, compounding: Compounding = 'monthly'): number =>
  1 / (compounding === 'monthly' ? Math.pow(1 + annualRate / 12, t) : Math.pow(1 + annualRate, t / 12));

/** NPV of a monthly cash-flow (index 0 = month 1): sum of net[t - 1] / (1 + r/12)^t, or / (1 + r)^(t/12) with annual compounding. */
export function npvOf(net: ArrayLike<number>, annualRate: number, compounding: Compounding = 'monthly'): number {
  let v = 0;
  if (compounding === 'monthly') {
    const dr = annualRate / 12;
    for (let t = 1; t <= net.length; t++) v += (net[t - 1] as number) / Math.pow(1 + dr, t);
  } else for (let t = 1; t <= net.length; t++) v += (net[t - 1] as number) / Math.pow(1 + annualRate, t / 12);
  return v;
}

/** Net ROI as a ratio, or null when nothing was invested (setup <= 0) or the net is not finite (legacy v18.9 M-2/M-3). */
export const roiCanonical = (net: number, setup: number): number | null => (setup > 0 && isFinite(net) ? net / setup : null);

export interface CashflowOpts {
  /** annual discount rate; null / undefined = DEFAULT_DISCOUNT_RATE */
  annualRate?: number | null;
  /** first month (1-based) that may be the payback month (default 1) */
  firstMonth?: number;
  compounding?: Compounding;
}
export interface CashflowSummary {
  /** cumulative cash-flow by month (index 0 = month 1) */
  cumulative: number[];
  paybackMonth: number | null;
  npv: number;
  /** sum of the monthly amounts (= the last cumulative; 0 for an empty flow) */
  total: number;
}

/** Cumulative, payback month, NPV and total of a monthly cash-flow. */
export function cashflowSummary(net: ArrayLike<number>, opts: CashflowOpts = {}): CashflowSummary {
  const cumulative = cumulativeOf(net);
  return {
    cumulative, paybackMonth: paybackMonthOf(cumulative, opts.firstMonth), npv: npvOf(net, rateOr(opts.annualRate), opts.compounding),
    total: cumulative.length ? (cumulative[cumulative.length - 1] as number) : 0,
  };
}
