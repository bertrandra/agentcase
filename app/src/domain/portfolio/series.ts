import { memoChain } from './memo';
import type { ProductRun } from './run';
import type { Scheduled } from './timeline';

/** Additive monthly measures on the calendar axis (index i = calendar month i + 1). `adoptionW` is adoption % x base ETP, to be weighted back. */
export const MEASURES = ['net', 'savings', 'run', 'setup', 'ktSetup', 'token', 'infra', 'humanFte', 'agentVfte', 'ktAvoided', 'khCost', 'adoptionW'] as const;
export type Measure = (typeof MEASURES)[number];
export type Series = Record<Measure, number[]>;

/** A product's Time Engine rows laid on the calendar. */
export interface ProductSeries extends Series {
  /** first calendar month (1-based) with a cash movement: month 1 of the product, or the first KT preparation month */
  first: number;
}

export const zeros = (n: number): number[] => new Array<number>(n).fill(0);
export const emptySeries = (n: number): Series => Object.fromEntries(MEASURES.map((m) => [m, zeros(n)])) as unknown as Series;

/** acc += s, measure by measure. */
export function addInto(acc: Series, s: Series): void {
  for (const m of MEASURES) { const a = acc[m], b = s[m]; for (let i = 0; i < a.length; i++) a[i]! += b[i]!; }
}

export function cumulative(a: number[]): number[] {
  const out = new Array<number>(a.length);
  let c = 0;
  for (let i = 0; i < a.length; i++) { c += a[i]!; out[i] = c; }
  return out;
}

/** Sum by blocks of 12 calendar months (the last block may be partial). */
export function byYear(a: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i += 12) out.push(a.slice(i, i + 12).reduce((x, y) => x + y, 0));
  return out;
}

function build(run: ProductRun, s: Scheduled, L: number): ProductSeries {
  const out = { ...emptySeries(L), first: s.month0 + 1 }, kept = Math.max(0, Math.min(run.rows.length, L - s.month0));
  for (let t = 1; t <= kept; t++) {
    const r = run.rows[t - 1]!, i = s.month0 + t - 1;
    out.net[i] = r.netSavings; out.savings[i] = r.grossSavings; out.run[i] = r.totalRunCost; out.setup[i] = r.setupCost; out.token[i] = r.tokenCost;
    out.infra[i] = r.infrastructureCost; out.humanFte[i] = r.humanFte; out.agentVfte[i] = r.agentVfte; out.ktAvoided[i] = r.knowledgeTransferAvoided;
    out.khCost[i] = r.knowledgeHubCost; out.adoptionW[i] = run.baseEtp * r.adoptionRampPct;
  }
  const part = run.ktSetup > 0 ? run.ktSetup / run.profile : 0;
  if (part === 0) return out;
  for (let t = 1; t <= run.profile; t++) {
    const home = s.month0 + t - 1, placed = s.month0 - s.lead + t - 1;
    if (s.lead > 0 && home < L) { out.setup[home]! -= part; out.net[home]! += part; }
    if (placed < L) { out.ktSetup[placed]! += part; if (s.lead > 0) { out.setup[placed]! += part; out.net[placed]! -= part; } }
  }
  if (s.lead > 0) out.first = s.month0 - s.lead + 1;
  return out;
}

const cache = new WeakMap<object, unknown>();
/** The product's calendar series; memoised on the run, so moving another product never recomputes it. A KT lead moves only the KT part of the setup. */
export const productSeries = (run: ProductRun, s: Scheduled, L: number): ProductSeries =>
  memoChain(cache, [run], `${s.month0}|${s.lead}|${L}`, () => build(run, s, L));
