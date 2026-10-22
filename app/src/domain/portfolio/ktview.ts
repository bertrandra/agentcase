import { infraShares } from './resolve';
import { knowledgeTotals, type KnowledgeRow, type KnowledgeTotals } from './knowledge';
import type { Portfolio } from './types';

/** F31: the hub effect of one wave = the sum, over its kept products, of each product's with/without-hub delta (`hubView`). */
export interface WaveEffect extends KnowledgeTotals { waveId: string; name: string; startMonth: number; products: number; users: number }

/** Per-wave sums of the Knowledge transfer rows, in wave order (no new formula: sums of the rows, which come from `hubView`). */
export function waveEffects(pf: Portfolio, rows: KnowledgeRow[]): WaveEffect[] {
  return pf.waves.map((w) => {
    const mine = rows.filter((r) => r.waveId === w.id);
    return { waveId: w.id, name: w.name, startMonth: w.startMonth, products: mine.length, users: mine.filter((r) => r.usesHub).length, ...knowledgeTotals(mine) };
  });
}

export interface InfraShare { productId: string; name: string; monthly: number; annual: number }
export interface InfraView {
  mode: 'perProduct' | 'byBaseEtp';
  /** the hub's monthly infrastructure cost */
  monthly: number;
  /** what the shares must add up to: the full cost (byBaseEtp, when someone uses the hub) or the full cost for each user (perProduct) */
  expected: number;
  /** shares of the planned, kept products that use the hub */
  shares: InfraShare[];
  sum: number;
  /** conservation check (spec A12): the shares add up to `expected` to the cent */
  conserved: boolean;
}

/** The infrastructure charged to each hub user under the portfolio's allocation mode, and the conservation check (never double counted). */
export function infraView(pf: Portfolio, rows: KnowledgeRow[]): InfraView {
  const all = infraShares(pf), monthly = pf.hub.infraMonthly, mode = pf.hub.infraAllocation, shares: InfraShare[] = [];
  pf.products.forEach((p, i) => {
    const r = rows.find((x) => x.productId === p.id);
    if (r && r.usesHub && r.prepMonth !== null) shares.push({ productId: p.id, name: p.name, monthly: all[i] as number, annual: (all[i] as number) * 12 });
  });
  const sum = Math.round(shares.reduce((a, s) => a + s.monthly, 0) * 100) / 100;
  const expected = mode === 'byBaseEtp' ? (shares.length ? monthly : 0) : Math.round(shares.length * monthly * 100) / 100;
  return { mode, monthly, expected, shares, sum, conserved: Math.abs(sum - expected) < 0.005 };
}
