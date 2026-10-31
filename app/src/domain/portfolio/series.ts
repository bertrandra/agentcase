/** @calc-zone portfolio-consolidation */
import { memoChain } from './memo';
import type { ProductRun } from './run';
import type { Scheduled } from './timeline';

/**
 * Additive monthly measures on the calendar axis (index i = calendar month i + 1). `adoptionW` is adoption % x base ETP, to be weighted back.
 * `humanFte` is the total human FTE (delivery team plus the agentic run team), the definition of the single case's `fte.after`.
 * Flows (net, savings, run, setup, ...) are 0 outside the product's own months; the stock measures (`humanFte`, `agentVfte`, `adoptionW`) are 0 before
 * the product starts and HELD at their last value after its own horizon ends inside a longer portfolio horizon (the team does not vanish).
 */
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

/** Sum by blocks of 12 calendar months (the last block may be partial). */
export function byYear(a: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i += 12) out.push(a.slice(i, i + 12).reduce((x, y) => x + y, 0));
  return out;
}

/** What the calendar layout reads of a run: the engine's months, the entry headcount and the KT part of the setup (a product, or one of its scenarios). */
export type SeriesSource = Pick<ProductRun, 'rows' | 'baseEtp' | 'ktSetup' | 'ktMonths'>;
/** Where a product sits on the calendar. */
export type Placement = Pick<Scheduled, 'month0' | 'lead'>;

function build(run: SeriesSource, s: Placement, L: number): ProductSeries {
  const out = { ...emptySeries(L), first: s.month0 + 1 }, kept = Math.max(0, Math.min(run.rows.length, L - s.month0));
  for (let t = 1; t <= kept; t++) {
    const r = run.rows[t - 1]!, i = s.month0 + t - 1;
    out.net[i] = r.netSavings; out.savings[i] = r.grossSavings; out.run[i] = r.totalRunCost; out.setup[i] = r.setupCost; out.token[i] = r.tokenCost;
    out.infra[i] = r.infrastructureCost; out.humanFte[i] = r.humanFte + r.runTeamFte; out.agentVfte[i] = r.agentVfte;
    out.ktAvoided[i] = r.knowledgeTransferAvoided;
    out.khCost[i] = r.knowledgeHubCost; out.adoptionW[i] = run.baseEtp * r.adoptionRampPct;
  }
  if (kept > 0 && kept === run.rows.length) {   // the product's horizon ends inside the portfolio's: its stocks stay where they ended
    const e = s.month0 + kept - 1;
    for (let i = e + 1; i < L; i++) { out.humanFte[i] = out.humanFte[e]!; out.agentVfte[i] = out.agentVfte[e]!; out.adoptionW[i] = out.adoptionW[e]!; }
  }
  if (!(run.ktSetup > 0)) return out;
  for (let t = 1; t <= run.ktMonths.length; t++) {
    const part = run.ktMonths[t - 1]!, home = s.month0 + t - 1, placed = s.month0 - s.lead + t - 1;
    if (part === 0) continue;
    if (s.lead > 0 && home < L) { out.setup[home]! -= part; out.net[home]! += part; }
    if (placed < L) { out.ktSetup[placed]! += part; if (s.lead > 0) { out.setup[placed]! += part; out.net[placed]! -= part; } }
  }
  if (s.lead > 0) out.first = s.month0 - s.lead + 1;
  return out;
}

const cache = new WeakMap<object, unknown>();
/** The product's calendar series; memoised on the run, so moving another product never recomputes it. A KT lead moves only the KT part of the setup. */
export const productSeries = (run: SeriesSource, s: Placement, L: number): ProductSeries =>
  memoChain(cache, [run], `${s.month0}|${s.lead}|${L}`, () => build(run, s, L));
