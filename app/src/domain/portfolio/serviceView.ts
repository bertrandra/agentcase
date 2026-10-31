/** @calc-zone product-resolution */
import { lineCost } from '../location';
import type { ServiceActivity, ServiceDef } from '../org/services';
import type { TeamRow } from '../types/state';
import { ctxOf, memoChain } from './memo';
import { resolveCommon, resolveProduct } from './resolve';
import { lineRule, lineShares, serviceDeliveries } from './serviceShares';
import type { Portfolio, SharedTeamLine } from './types';

/**
 * The Services view model (docs/SPEC_BPMN.md § 21 F-B82, phase B10c): per shared service, what it delivers to each product (activities, effort),
 * the FTE and cost each product carries and the rule that split them. A product's cost of a line is READ from the product's own case — the
 * annual cost (`lineCost`: FTE × day rate × working days) of the row the line gives its entry team (`effectiveTeam`), so it is the very figure
 * every product surface sums (cross-surface by construction). The line's cost is its full FTE at the common rate card; what no product holds
 * (fixed shares under 100 %) is shown as unallocated. With the common rates, Σ products + unallocated = the line's cost.
 */
export interface ServiceProductRow {
  productId: string; name: string;
  activities: ServiceActivity[];
  /** the service's effort for the product, the product's whole scope weight, and the product's share of the service's effort (%) */
  effort: number; scopeEffort: number; effortPct: number;
  /** FTE and annual cost the product carries, summed over the service's lines */
  fte: number; cost: number;
}
export interface ServiceLineShare { productId: string; pct: number; fte: number; cost: number }
export interface ServiceLineView {
  line: SharedTeamLine; rule: 'effort' | 'fixed';
  /** annual cost of the whole line at the common rate card */
  cost: number;
  shares: ServiceLineShare[];
  /** percent and annual cost of the line no product holds (fixed shares under 100 %); 0 when over-allocated */
  unallocatedPct: number; unallocatedCost: number;
}
export interface ServiceView {
  id: string; name: string; def: ServiceDef;
  /** Σ FTE of its lines (the capacity of the load chart) and Σ their annual cost */
  capacity: number; cost: number;
  products: ServiceProductRow[];
  lines: ServiceLineView[];
}

const shareRow = (rows: readonly TeamRow[], lineId: string): TeamRow | undefined => rows.find((r) => r.shared === lineId);
const roots = new WeakMap<object, unknown>();

/** The services of a portfolio with their delivery, FTE and cost by product (all kept products; the screen keeps the View's). Memoised. */
export function servicesView(pf: Portfolio): ServiceView[] {
  const ds = serviceDeliveries(pf);
  if (!ds.length) return [];
  return memoChain(roots, [pf, ds], 'view', () => {
    const common = ctxOf(resolveCommon(pf, [])), byId = new Map(pf.products.map((p) => [p.id, p]));
    const caseOf = (id: string) => ctxOf(resolveProduct(pf, id));
    return ds.map(({ def, products }): ServiceView => {
      const lines = def.lines.map((line): ServiceLineView => {
        const pcts = lineShares(pf, line), full = lineCost(common.s, common.inp, { ...line, pins: [] });
        const shares = Object.entries(pcts).filter(([id, pct]) => pct > 0 && byId.has(id)).map(([productId, pct]): ServiceLineShare => {
          const c = caseOf(productId), row = shareRow(c.s.teamIn, line.id);
          return { productId, pct, fte: row ? +row.etp || 0 : 0, cost: row ? lineCost(c.s, c.inp, row) : 0 };
        });
        const held = shares.reduce((s, x) => s + x.pct, 0), rest = held < 100 ? 100 - held : 0;
        return { line, rule: lineRule(pf, line), cost: full, shares, unallocatedPct: rest, unallocatedCost: (full * rest) / 100 };
      });
      const total = products.reduce((s, x) => s + x.effort, 0);
      const rows = products.map((x): ServiceProductRow => {
        const mine = lines.flatMap((l) => l.shares.filter((s) => s.productId === x.productId));
        return { productId: x.productId, name: byId.get(x.productId)?.name ?? x.productId, activities: x.activities, effort: x.effort,
          scopeEffort: x.scopeEffort, effortPct: total > 0 ? (x.effort / total) * 100 : 0,
          fte: mine.reduce((s, m) => s + m.fte, 0), cost: mine.reduce((s, m) => s + m.cost, 0) };
      });
      return { id: def.id, name: def.name, def, capacity: def.lines.reduce((s, l) => s + (+l.etp || 0), 0),
        cost: lines.reduce((s, l) => s + l.cost, 0), products: rows, lines };
    });
  });
}
