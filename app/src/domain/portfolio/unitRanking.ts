/** @calc-zone verdict */
import type { Verdict } from '../verdict';
import type { Consolidated } from './consolidate';
import type { DisplayScope } from './portfolioHeadline';
import { groupOf, portfolioUnits, UNASSIGNED_UNIT } from './scopeGroup';
import { pfDecision } from './stressVerdict';
import type { PfStress } from './stressTypes';
import type { Portfolio } from './types';

type UnitScope = { kind: 'unit'; id: string };

/** One unit of a ranking: its consolidated figures (`groupOf`) and its decision on the portfolio run (`pfDecision`), or null without a run. */
export interface UnitRankRow {
  id: string; label: string; rank: number;
  /** planned products of the unit (directly or through its sub-units) */
  products: number;
  npv: number; net: number; setup: number; roi: number | null;
  p10: number | null; p50: number | null; verdict: Verdict | null; confidence: number | null;
}

/**
 * The units a ranking compares under a display scope: at the Portfolio, the roots of the tree and "Unassigned"; at a unit, its direct sub-units; none
 * at a wave, a product or "Unassigned" (a wave can span units: its products are ranked by wave verdicts instead).
 */
export function childUnitScopes(pf: Portfolio, scope: DisplayScope): UnitScope[] {
  const units = portfolioUnits(pf), known = new Set(units.map((u) => u.id));
  if (scope.kind === 'portfolio') {
    return [...units.filter((u) => !u.parent || !known.has(u.parent)).map((u) => ({ kind: 'unit' as const, id: u.id })), { kind: 'unit', id: UNASSIGNED_UNIT }];
  }
  if (scope.kind !== 'unit' || scope.id === UNASSIGNED_UNIT) return [];
  return units.filter((u) => u.parent === scope.id && u.id !== scope.id).map((u) => ({ kind: 'unit' as const, id: u.id }));
}

const ORDER: Record<Verdict, number> = { strong: 0, conditional: 1, defer: 2 };
const order = (v: Verdict | null): number => (v ? ORDER[v] : 3);

/**
 * The ranking of the units under a display scope (F-B83, D-B40): each unit with a planned product, its NPV / net / ROI (the unit's consolidation,
 * `groupOf`) and its decision (the single-case rule on its distribution, `pfDecision`), best first — by verdict (Strong, Conditional, Defer), then by
 * confidence P(net > 0), then by NPV. No figure is computed here: the ranking only orders the owners' figures.
 */
export function unitRanking(pf: Portfolio, c: Consolidated, run: PfStress | null, scope: DisplayScope): UnitRankRow[] {
  const rows = childUnitScopes(pf, scope).flatMap((u): Omit<UnitRankRow, 'rank'>[] => {
    const g = groupOf(c, u);
    if (!g || !g.items.length) return [];
    const d = run ? pfDecision(pf, run, u) : null, s = g.summary;
    return [{ id: u.id, label: g.label, products: g.items.length, npv: s.npv, net: s.net, setup: s.setup, roi: s.roi,
      p10: d ? d.stats.p10 : null, p50: d ? d.stats.p50 : null, verdict: d?.verdict ?? null, confidence: d?.confidence ?? null }];
  });
  rows.sort((a, b) => order(a.verdict) - order(b.verdict) || (b.confidence ?? -1) - (a.confidence ?? -1) || b.npv - a.npv);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
