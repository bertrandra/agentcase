import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { cashflowSummary, cumulativeOf, DEFAULT_DISCOUNT_RATE, discountFactor, npvOf, paybackMonthOf, rateOr, roiCanonical } from '@/domain/economics/cashflow';

/**
 * The discounted-cash-flow kernel (docs/ARCHITECTURE.md section 3) against verbatim copies of the six loops it replaced (lot 4).
 * Every comparison is bit for bit (`Object.is`), on random cash flows: a refactor of the kernel that moves a single ulp fails here.
 */
const D = 0.08;
/** time/engine.ts path() + npv() before lot 4 */
function oldEngine(net: number[], annualRate?: number | null) {
  const N = net.length, cum = new Float64Array(N + 1);
  let payback: number | null = null;
  for (let t = 1; t <= N; t++) { cum[t] = (cum[t - 1] as number) + (net[t - 1] as number); if (payback === null && (cum[t] as number) >= 0) payback = t; }
  const dr = (annualRate == null ? D : annualRate) / 12;
  let v = 0;
  for (let t = 1; t <= N; t++) v += (net[t - 1] as number) / Math.pow(1 + dr, t);
  let tot = 0;
  for (let t = 1; t <= N; t++) tot += net[t - 1] as number;
  return { cum: [...cum.slice(1)], payback, npv: v, tot };
}
/** time/thin.ts thinAggregate() before lot 4 (one pass) */
function oldThin(net: number[], annualRate?: number | null) {
  const dr = (annualRate == null ? D : annualRate) / 12;
  let cum = 0, payback: number | null = null, npv = 0, totalNet = 0;
  for (let t = 1; t <= net.length; t++) { const n = net[t - 1] as number; cum += n; if (payback === null && cum >= 0) payback = t; npv += n / Math.pow(1 + dr, t); totalNet += n; }
  return { payback, npv, totalNet };
}
/** portfolio/headline.ts summarize() before lot 4 (payback not before the first movement) */
function oldPortfolio(net: number[], first: number, rate: number) {
  const cum: number[] = [];
  let c = 0;
  for (const x of net) { c += x; cum.push(c); }
  const dr = rate / 12;
  let paybackMonth: number | null = null, npv = 0;
  for (let T = 1; T <= net.length; T++) { if (paybackMonth === null && T >= first && (cum[T - 1] as number) >= 0) paybackMonth = T; npv += (net[T - 1] as number) / Math.pow(1 + dr, T); }
  return { cum, paybackMonth, npv };
}
/** model/flow.ts flowModel() before lot 4: a constant monthly value, annual compounding with a fractional exponent */
function oldFlow(value: number, months: number, d: number) {
  let npv = 0;
  for (let mo = 1; mo <= months; mo++) npv += value / Math.pow(1 + d, mo / 12);
  return npv;
}
/** portfolio/costModel.ts discount factor row before lot 4 */
const oldFactor = (i: number, rate: number) => 1 / Math.pow(1 + rate / 12, i + 1);

const money = fc.double({ min: -2e6, max: 2e6, noNaN: true, noDefaultInfinity: true });
const flow = fc.array(money, { minLength: 0, maxLength: 130 });
const rate = fc.oneof(fc.constant(undefined), fc.constant(null), fc.double({ min: 0, max: 1, noNaN: true }));
const same = (a: unknown, b: unknown) => expect(Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b), `${String(a)} vs ${String(b)}`).toBe(true);
const sameArr = (a: number[], b: number[]) => { expect(a.length).toBe(b.length); a.forEach((x, i) => expect(Object.is(x, b[i]), `index ${i}`).toBe(true)); };

describe('cash-flow kernel = the loops it replaced, bit for bit', () => {
  it('Time Engine path, NPV and total', () => fc.assert(fc.property(flow, rate, (net, r) => {
    const o = oldEngine(net, r), k = cashflowSummary(net, { annualRate: r });
    sameArr(k.cumulative, o.cum); same(k.paybackMonth, o.payback); same(k.npv, o.npv); same(k.total, o.tot);
    same(npvOf(net, rateOr(r)), o.npv);
  }), { numRuns: 400 }));
  it('thin Monte Carlo pass', () => fc.assert(fc.property(flow, rate, (net, r) => {
    const o = oldThin(net, r), k = cashflowSummary(net, { annualRate: r });
    same(k.paybackMonth, o.payback); same(k.npv, o.npv); same(k.total, o.totalNet);
  }), { numRuns: 400 }));
  it('portfolio summary with a first month', () => fc.assert(fc.property(flow, fc.integer({ min: 1, max: 140 }), fc.double({ min: 0, max: 1, noNaN: true }), (net, first, r) => {
    const o = oldPortfolio(net, first, r), k = cashflowSummary(net, { annualRate: r, firstMonth: first });
    sameArr(k.cumulative, o.cum); same(k.paybackMonth, o.paybackMonth); same(k.npv, o.npv);
  }), { numRuns: 400 }));
  it('time-to-market value: annual compounding', () => fc.assert(fc.property(money, fc.integer({ min: 0, max: 120 }), fc.double({ min: 0, max: 1, noNaN: true }), (v, n, d) => {
    same(npvOf(new Array<number>(n).fill(v), d, 'annual'), oldFlow(v, n, d));
  }), { numRuns: 400 }));
  it('discount factor row', () => fc.assert(fc.property(fc.integer({ min: 0, max: 200 }), fc.double({ min: 0, max: 1, noNaN: true }), (i, r) => {
    same(discountFactor(i + 1, r), oldFactor(i, r));
  }), { numRuns: 400 }));
});

describe('cash-flow kernel: rules', () => {
  it('one default rate, payback edge cases, ROI null rule', () => {
    expect(DEFAULT_DISCOUNT_RATE).toBe(0.08);
    expect(rateOr(null)).toBe(0.08); expect(rateOr(0)).toBe(0);
    expect(paybackMonthOf([-1, 0, 5])).toBe(2);
    expect(paybackMonthOf([0, 0, 1], 3)).toBe(3);
    expect(paybackMonthOf([-1, -2])).toBeNull();
    expect(paybackMonthOf([])).toBeNull();
    expect(cashflowSummary([]).total).toBe(0);
    expect(cumulativeOf([1, 2, 3])).toEqual([1, 3, 6]);
    expect(roiCanonical(10, 0)).toBeNull(); expect(roiCanonical(Infinity, 5)).toBeNull(); expect(roiCanonical(10, 5)).toBe(2);
    expect(discountFactor(12, 0.1, 'annual')).toBeCloseTo(1 / 1.1, 12);
  });
});
