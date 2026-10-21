import { roiCanonical } from '../economics/roi';
import { econ, type K } from './kernel';
import { monthRow, type MonthRow } from './rows';
import { aggregateYear, type YearRow } from './years';

const MILESTONES = [10, 25, 50, 70, 85, 95];

interface Crossing { type: string; level?: string; pct?: number; month: number }
interface PathMemo { cum: Float64Array; payback: number | null; crossings: Crossing[] }

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
  function path() {
    if (pathMemo) return pathMemo;
    const cum = new Float64Array(N + 1), crossings: Crossing[] = [];
    let payback: number | null = null, prev = 'L1';
    for (let t = 1; t <= N; t++) {
      const row = monthAt(t);
      cum[t] = (cum[t - 1] as number) + row.netSavings;
      if (payback === null && (cum[t] as number) >= 0) payback = t;
      if (row.maturityLevel !== prev) { crossings.push({ type: 'maturity', level: row.maturityLevel, month: t }); prev = row.maturityLevel; }
      const prevRamp = t === 1 ? -1 : monthAt(t - 1).adoptionRampPct;
      for (const th of MILESTONES) if (row.adoptionRampPct >= th && prevRamp < th) crossings.push({ type: 'adoption', pct: th, month: t });
    }
    return (pathMemo = { cum, payback, crossings });
  }
  const cumulativeAt = (t: number) => { if (t < 1 || t > N) throw new Error('TIME.cumulativeAt out of range'); return path().cum[t] as number; };
  const payback = () => path().payback;
  function npv(annualRate?: number | null): number {
    const dr = (annualRate == null ? 0.08 : annualRate) / 12;
    let v = 0;
    for (let t = 1; t <= N; t++) v += monthAt(t).netSavings / Math.pow(1 + dr, t);
    return v;
  }
  function roi(): number | null {
    let net = 0;
    for (let t = 1; t <= N; t++) net += monthAt(t).netSavings;
    return roiCanonical(net, K.setupTotal);
  }
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
  function headline(annualRate: number) {
    let tot = 0;
    for (let t = 1; t <= N; t++) tot += monthAt(t).netSavings;
    return { payback: payback(), npv: npv(annualRate), roi: roi(), totalSavings: tot };
  }
  return { K, horizonYears: K.horizonYears, horizonMonths: N, monthAt, months, cumulativeAt, payback, npv, roi, year, years: allYears, milestones, headline };
}
export type Engine = ReturnType<typeof makeEngine>;
