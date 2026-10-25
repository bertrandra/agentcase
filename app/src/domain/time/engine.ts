/** @calc-zone time-engine */
import { cumulativeOf, npvOf, paybackMonthOf, rateOr, roiCanonical } from '../economics/cashflow';
import { econ, type K } from './kernel';
import { monthRow, type MonthRow } from './rows';
import { aggregateYear, type YearRow } from './years';

const MILESTONES = [10, 25, 50, 70, 85, 95];

interface Crossing { type: string; level?: string; pct?: number; month: number }
interface PathMemo { cum: number[]; payback: number | null; crossings: Crossing[] }

export interface Milestone { month: number; family: string; label: string; pct?: number; level?: string }

/** One engine instance = one frozen K + memoised monthly rows (legacy makeEngine, full mode). */
export function makeEngine(K: K) {
  const N = K.horizonMonths;
  const rows: (MonthRow | undefined)[] = new Array(N + 1);
  const years: (YearRow | undefined)[] = new Array(K.horizonYears + 2);
  let pathMemo: PathMemo | null = null;

  function monthAt(t: number): MonthRow {
    if (t < 1 || t > N) throw new Error(`TIME.monthAt: month ${t} out of range [1,${N}]`);
    return (rows[t] ??= monthRow(econ(t, K), K));
  }
  let netMemo: number[] | null = null;
  /** Net cash-flow of each month (index 0 = month 1): the input of the cash-flow kernel. */
  const nets = (): number[] => (netMemo ??= Array.from({ length: N }, (_, i) => monthAt(i + 1).netSavings));
  function path() {
    if (pathMemo) return pathMemo;
    const cum = cumulativeOf(nets()), crossings: Crossing[] = [];
    let prev = 'L1';
    for (let t = 1; t <= N; t++) {
      const row = monthAt(t);
      if (row.maturityLevel !== prev) { crossings.push({ type: 'maturity', level: row.maturityLevel, month: t }); prev = row.maturityLevel; }
      const prevRamp = t === 1 ? -1 : monthAt(t - 1).adoptionRampPct;
      for (const th of MILESTONES) if (row.adoptionRampPct >= th && prevRamp < th) crossings.push({ type: 'adoption', pct: th, month: t });
    }
    return (pathMemo = { cum, payback: paybackMonthOf(cum), crossings });
  }
  const cumulativeAt = (t: number) => { if (t < 1 || t > N) throw new Error('TIME.cumulativeAt out of range'); return path().cum[t - 1] as number; };
  const payback = () => path().payback;
  /** Sum of the monthly net cash-flow (= the last cumulative). */
  const total = (): number => (N ? (path().cum[N - 1] as number) : 0);
  /** NPV at an annual rate (default 8 %), monthly discounting: the cash-flow kernel. */
  const npv = (annualRate?: number | null): number => npvOf(nets(), rateOr(annualRate));
  const roi = (): number | null => roiCanonical(total(), K.setupTotal);
  function year(y: number): YearRow {
    if (y < 1 || y > K.horizonYears) throw new Error('TIME.year out of range');
    return (years[y] ??= aggregateYear(y, N, monthAt, cumulativeAt, payback()));
  }
  const allYears = () => Array.from({ length: K.horizonYears }, (_, i) => year(i + 1));
  const months = () => Array.from({ length: N }, (_, i) => monthAt(i + 1));
  function milestones(): Milestone[] {
    const out: Milestone[] = path().crossings.map((c) => c.type === 'adoption'
      ? { month: c.month, family: 'adoption', pct: c.pct, label: `${c.pct}% adoption` }
      : { month: c.month, family: c.type, level: c.level, label: `${c.level} maturity reached` });
    const pb = payback();
    if (pb != null) out.push({ month: pb, family: 'financial', label: 'Payback (break-even)' });
    for (let t = 1; t <= N; t++) if (monthAt(t).agentVfte > 1e-4) { out.push({ month: t, family: 'workforce', label: 'First agent vFTE' }); break; }
    return out.sort((a, b) => a.month - b.month || (a.family > b.family ? 1 : -1));
  }
  /** Payback, NPV at the caller's discount rate, ROI and total savings; the rate is an explicit argument (the case owns it: canonical `caseDiscountRate`). */
  const headline = (annualRate: number) => ({ payback: payback(), npv: npv(annualRate), roi: roi(), totalSavings: total() });
  return { K, horizonYears: K.horizonYears, horizonMonths: N, monthAt, months, cumulativeAt, payback, total, npv, roi, year, years: allYears, milestones,
    headline };
}
export type Engine = ReturnType<typeof makeEngine>;
